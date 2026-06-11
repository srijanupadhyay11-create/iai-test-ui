import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import config from '../config.js';

const { owner, repo, branch, testsPath, token } = config.github;
const { localFrameworkPath } = config.playwright;
const BASE_URL = 'https://api.github.com';

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'IAI-Test-UI',
  };
  if (token) headers['Authorization'] = `token ${token}`;
  return headers;
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: githubHeaders() });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
  return res.json();
}

async function listSpecFilesFromGitHub(dirPath: string): Promise<{ name: string; path: string; download_url: string }[]> {
  const url = `${BASE_URL}/repos/${owner}/${repo}/contents/${dirPath}?ref=${branch}`;
  const items: any[] = await fetchJson(url);
  const specFiles: { name: string; path: string; download_url: string }[] = [];

  for (const item of items) {
    if (item.type === 'dir') {
      const nested = await listSpecFilesFromGitHub(item.path);
      specFiles.push(...nested);
    } else if (item.type === 'file' && item.name.endsWith('.spec.ts')) {
      specFiles.push({ name: item.name, path: item.path, download_url: item.download_url });
    }
  }
  return specFiles;
}

function listSpecFilesLocally(dirPath: string, rootPath: string): { name: string; path: string; absolutePath: string }[] {
  const entries = readdirSync(dirPath);
  const specFiles: { name: string; path: string; absolutePath: string }[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      specFiles.push(...listSpecFilesLocally(fullPath, rootPath));
    } else if (entry.endsWith('.spec.ts')) {
      const relativePath = path.relative(rootPath, fullPath);
      specFiles.push({ name: entry, path: relativePath, absolutePath: fullPath });
    }
  }
  return specFiles;
}

function parseTestNames(content: string): { name: string; describe: string }[] {
  const tests: { name: string; describe: string }[] = [];
  const lines = content.split('\n');
  let currentDescribe = '';

  for (const line of lines) {
    const descMatch = line.match(/test\.describe\s*\(\s*['"`](.*?)['"`]/);
    if (descMatch) currentDescribe = descMatch[1];

    const testMatch = line.match(/(?<![.\w])test\s*\(\s*['"`](.*?)['"`]/);
    if (testMatch) tests.push({ name: testMatch[1], describe: currentDescribe });
  }

  return tests;
}

async function importFromGitHub(): Promise<{ name: string; file_path: string; describe_block: string }[]> {
  const specFiles = await listSpecFilesFromGitHub(testsPath);
  const allTests: { name: string; file_path: string; describe_block: string }[] = [];

  for (const file of specFiles) {
    const res = await fetch(file.download_url, { headers: githubHeaders() });
    const content = await res.text();
    const tests = parseTestNames(content);
    for (const t of tests) {
      allTests.push({ name: t.name, file_path: file.path, describe_block: t.describe });
    }
  }
  return allTests;
}

function importFromLocal(): { name: string; file_path: string; describe_block: string }[] {
  const localTestsDir = path.join(localFrameworkPath, testsPath);
  const specFiles = listSpecFilesLocally(localTestsDir, localFrameworkPath);
  const allTests: { name: string; file_path: string; describe_block: string }[] = [];

  for (const file of specFiles) {
    const content = readFileSync(file.absolutePath, 'utf-8');
    const tests = parseTestNames(content);
    for (const t of tests) {
      allTests.push({ name: t.name, file_path: file.path, describe_block: t.describe });
    }
  }
  return allTests;
}

export async function importTestsFromGitHub(): Promise<{ name: string; file_path: string; describe_block: string }[]> {
  if (token) {
    return importFromGitHub();
  }

  // No token configured — fall back to local filesystem
  try {
    return importFromLocal();
  } catch (localErr: any) {
    // Local also failed; try GitHub anyway (handles public repos without token)
    try {
      return await importFromGitHub();
    } catch (ghErr: any) {
      throw new Error(
        `Cannot import tests. Local path "${path.join(localFrameworkPath, testsPath)}" failed (${localErr.message}) ` +
        `and GitHub API also failed (${ghErr.message}). ` +
        `Add a GitHub token to config/github.config.json to access private repos.`
      );
    }
  }
}
