import chalk from "chalk";
import { AuditResults } from "./auditor";

function printReport(result: AuditResults) {
  console.log(chalk.yellow('\nProject Audit Report:\n'));

  const checks: { 
    label: string; 
    isOk: boolean; 
    details?: string[]; 
    okMessage?: string 
  }[] = [
    {
      label: 'Empty folders detected',
      isOk: result.emptyFolders.length === 0,
      details: result.emptyFolders,
      okMessage: 'No empty folders',
    },
    {
      label: '.env.example found without .env file',
      isOk: !result.unusedEnvExample,
      okMessage: 'No .env.example without .env',
    },
    {
      label: 'Multiple README files detected',
      isOk: result.duplicatedReadmeFiles.length === 0,
      details: result.duplicatedReadmeFiles,
      okMessage: 'No multiple README files',
    },
    {
      label: 'Multiple .gitignore files detected',
      isOk: result.duplicatedGitIgnoreFiles.length === 0,
      details: result.duplicatedGitIgnoreFiles,
      okMessage: 'No multiple .gitignore files',
    },
  ];

  for (const check of checks) {
    if (check.isOk) {
      console.log(chalk.green(`✔️  ${check.okMessage}`));
    } else {
      console.log(chalk.red(`⚠️  ${check.label}`));
      check.details?.forEach(f => console.log('   -', f));
    }
  }
}

export default printReport;