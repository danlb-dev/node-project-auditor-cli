import chalk from 'chalk';
import { AuditResults, FileTypes } from './auditor';
import path from 'path';
import fs from 'fs-extra';
import simpleGit, { FileStatusResult, SimpleGit, StatusResult } from 'simple-git';

const README_REGEX: RegExp = /^README(?:\.md)?$/i;
const GITIGNORE_REGEX: RegExp = /^\.gitignore$/i;
const FOLDERS_TO_IGNORE: string[] = ['.git', 'dist', 'node_modules'];

function containsLockFile(details: string[] | undefined, name: string): boolean {
  return details?.some((file) => file.includes(name)) ?? false;
}

export function printReportToConsole(result: AuditResults): void {
  console.log(chalk.underline.yellow('\nProject Audit Report:\n'));

  const checks: {
    failMessage: string;
    checkPassed: boolean;
    testDetails?: string[];
    successMessage?: string;
  }[] = [
    {
      failMessage: 'Empty folders detected:',
      checkPassed: result.emptyFolders.length === 0,
      testDetails: result.emptyFolders,
      successMessage: 'No empty folders',
    },
    {
      failMessage: '.env.example found without .env file',
      checkPassed: !result.unusedEnvExample,
      successMessage: 'No .env.example without .env',
    },
    {
      failMessage: 'Multiple lock files found:',
      checkPassed: result.multipleLockFiles.length <= 1,
      testDetails: result.multipleLockFiles,
      successMessage: 'No multiple lock files found',
    },
    {
      failMessage: 'Multiple README files detected:',
      checkPassed: result.duplicatedReadmeFiles.length === 0,
      testDetails: result.duplicatedReadmeFiles,
      successMessage: 'No multiple README files',
    },
    {
      failMessage: 'Multiple .gitignore files detected:',
      checkPassed: result.duplicatedGitIgnoreFiles.length === 0,
      testDetails: result.duplicatedGitIgnoreFiles,
      successMessage: 'No multiple .gitignore files',
    },
    {
      failMessage: 'Files with changes not staged:',
      checkPassed: result.unstagedFiles.length === 0,
      testDetails: result.unstagedFiles,
      successMessage: 'No files with unstaged changes',
    },
  ];

  //Showing first the verifications that passed
  checks.sort((a, b) => Number(b.checkPassed) - Number(a.checkPassed));

  for (const check of checks) {
    if (check.checkPassed) {
      console.log(chalk.green(`✔  ${check.successMessage}`));
    } else {
      console.log(chalk.red(`⚠️  ${check.failMessage}`));
      check.testDetails?.forEach((f) => console.log('   -', f));

      if (check.failMessage == '.env.example found without .env file') {
        console.log(
          chalk.gray('💡 Consider committing a template .env or adding .env locally for dev.'),
        );
      } else if (check.failMessage == 'Multiple lock files found:') {
        const lockFileTypes: Record<string, string> = {
          'package-lock.json': 'npm',
          'yarn.lock': 'yarn',
          'pnpm-lock.yaml': 'pnpm',
          'bun.lockb': 'bun',
        };

        const foundTypes = new Set(
          (check.testDetails ?? [])
            .map((file) => lockFileTypes[path.basename(file)])
            .filter((t): t is string => Boolean(t)),
        );

        const lockFiles = Object.keys(lockFileTypes);
        const foundLocks = lockFiles.filter((name) => containsLockFile(check.testDetails, name));

        if (foundTypes.size > 1) {
          console.log(
            chalk.red('❌ Conflicting lock file types detected:'),
            [...foundTypes].join(', '),
          );
          console.log(
            chalk.gray('💡 Use only one package manager to avoid dependency resolution issues.'),
          );
        } else if (foundLocks.length > 1) {
          console.log(chalk.yellow('⚠️ Multiple lock files detected:'), foundLocks.join(', '));
        } else {
          console.log(
            chalk.gray(
              '💡 If this is not a monorepo or intentional multi-package setup, consider using only one package manager (npm, yarn, pnpm, or bun).',
            ),
          );
        }
      }
    }
  }
}

//#region Audit Tests

export async function checkForEmptyFolders(
  folderPath: string,
  auditResults: AuditResults,
): Promise<void> {
  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    if (entries.length == 0) {
      auditResults.emptyFolders.push(folderPath);
    } else {
      const directories = entries
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
      for (const dir of directories) {
        if (!FOLDERS_TO_IGNORE.includes(dir.toLowerCase())) {
          const dirPath = path.join(folderPath, dir);
          await checkForEmptyFolders(dirPath, auditResults);
        }
      }
    }
  } catch (error) {
    console.error(error);
  }
}

export async function checkForEnvExWithoutEnv(
  folderPath: string,
  auditResults: AuditResults,
): Promise<void> {
  try {
    const envExample = path.join(folderPath, '.env.example');
    const env = path.join(folderPath, '.env');

    if ((await fs.existsSync(envExample)) && !(await fs.existsSync(env))) {
      auditResults.unusedEnvExample = true;
    } else {
      const entries = (await fs.readdir(folderPath, { withFileTypes: true }))
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      if (entries.length > 0) {
        for (const dir of entries) {
          if (!FOLDERS_TO_IGNORE.includes(dir.toLowerCase())) {
            const dirPath = path.join(folderPath, dir);
            await checkForEnvExWithoutEnv(dirPath, auditResults);
          }
        }
      }
    }
  } catch (error) {
    console.error(error);
  }
}

export async function checkForMultipleLockFiles(
  folderPath: string,
  auditResults: AuditResults,
): Promise<void> {
  try {
    const knownLockFiles = [
      'package-lock.json', // npm
      'yarn.lock', // Yarn
      'pnpm-lock.yaml', // pnpm
      'bun.lockb', // Bun
    ];

    for (const lockFile of knownLockFiles) {
      const lockFilePath = path.join(folderPath, lockFile);
      if (await fs.existsSync(lockFilePath)) {
        auditResults.multipleLockFiles.push(lockFilePath);
      }
    }

    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    const directories = entries
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    if (directories.length > 0) {
      for (const dir of directories) {
        if (!FOLDERS_TO_IGNORE.includes(dir.toLowerCase())) {
          const dirPath = path.join(folderPath, dir);
          await checkForMultipleLockFiles(dirPath, auditResults);
        }
      }
    }
  } catch (error) {
    console.error(error);
  }
}

export async function checkForDuplicatedTypeFiles(
  folderPath: string,
  fileType: FileTypes,
  auditResults: AuditResults,
): Promise<void> {
  try {
    const duplicates: string[] = [];
    const entries = await fs.readdir(folderPath, { withFileTypes: true });

    for (let i = 0; i < entries.length; i++) {
      if (FOLDERS_TO_IGNORE.includes(entries[i].name.toLowerCase())) {
        continue;
      }

      const entryPath = path.join(folderPath, entries[i].name);
      const regexToUse = fileType == FileTypes.readme ? README_REGEX : GITIGNORE_REGEX;

      if (entries[i].isFile() && regexToUse.test(entries[i].name)) {
        duplicates.push(entryPath);
      } else if (entries[i].isDirectory()) {
        await checkForDuplicatedTypeFiles(entryPath, fileType, auditResults);
      }
    }

    if (duplicates.length > 1) {
      if (fileType == FileTypes.readme) {
        auditResults.duplicatedReadmeFiles.push(...duplicates);
      } else if (fileType == FileTypes.gitIgnore) {
        auditResults.duplicatedGitIgnoreFiles.push(...duplicates);
      }
    }
  } catch (error) {
    console.error(error);
  }
}

export async function checkForUnstagedFiles(
  dir: string,
  auditResults: AuditResults,
): Promise<void> {
  try {
    const git: SimpleGit = simpleGit(dir);
    const status: StatusResult = await git.status();
    const files: FileStatusResult[] = status.files;

    if (files.length > 0) {
      files.forEach((fileStatusResult) => {
        if (fileStatusResult.working_dir == 'M') {
          auditResults.unstagedFiles.push(fileStatusResult.path);
        }
      });
    }
  } catch (error) {
    console.error(error);
  }
}

//#endregion
