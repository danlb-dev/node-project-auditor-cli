import chalk from "chalk";
import { AuditResults } from "./auditor";
import path from "path";

function printReport(result: AuditResults) {
  console.log(chalk.underline.yellow('\nProject Audit Report:\n'));

  const checks: { 
    failMessage: string; 
    checkPassed: boolean; 
    testDetails?: string[]; 
    successMessage?: string 
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
    }
  ];

  //Showing first the verifications that passed
  checks.sort((a, b) => Number(b.checkPassed) - Number(a.checkPassed));

  for (const check of checks) {
    if (check.checkPassed) {
      console.log(chalk.green(`✔  ${check.successMessage}`));
    } else {
      console.log(chalk.red(`⚠️  ${check.failMessage}`));
      check.testDetails?.forEach(f => console.log('   -', f));

      if(check.failMessage == '.env.example found without .env file'){
        console.log(chalk.gray('💡 Consider committing a template .env or adding .env locally for dev.'));
      }
      else if(check.failMessage == 'Multiple lock files found:'){
        const lockFileTypes: Record<string, string> = {
          'package-lock.json': 'npm',
          'yarn.lock': 'yarn',
          'pnpm-lock.yaml': 'pnpm',
          'bun.lockb': 'bun'
        };

        const foundTypes = new Set(
          (check.testDetails ?? [])
            .map(file => lockFileTypes[path.basename(file)])
            .filter((t): t is string => Boolean(t))
        );

        const lockFiles = Object.keys(lockFileTypes);
        const foundLocks = lockFiles.filter(name => containsLockFile(check.testDetails, name));

        if (foundTypes.size > 1) {
          console.log(chalk.red('❌ Conflicting lock file types detected:'), [...foundTypes].join(', '));
          console.log(chalk.gray('💡 Use only one package manager to avoid dependency resolution issues.'));
        } else if (foundLocks.length > 1) {
          console.log(chalk.yellow('⚠️ Multiple lock files detected:'), foundLocks.join(', '));
        } else {
          console.log(chalk.gray('💡 If this is not a monorepo or intentional multi-package setup, consider using only one package manager (npm, yarn, pnpm, or bun).'));
        }
      }
    }
  }
}

function containsLockFile(details: string[] | undefined, name: string): boolean {
  return details?.some(file => file.includes(name)) ?? false;
}

export default printReport;