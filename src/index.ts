import { Command } from 'commander';
import { auditProject, AuditResults } from './auditor';
import { printReportToConsole } from './auditorHelper';
import pkgJson from '../package.json';
import path from 'path';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import chalk from 'chalk';

async function main() {
  const program = new Command();

  program.name(pkgJson.name).description(pkgJson.description).version(pkgJson.version).parse();

  try {
    const { folderPath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'folderPath',
        message: ' Please enter the path of the project folder to audit:',
        default: '.',
        validate: (input) => {
          if (fs.existsSync(input) && fs.lstatSync(input).isDirectory()) {
            return true;
          } else {
            return 'Folder does not exist or is not a directory';
          }
        },
      },
    ]);

    const fullPath: string = path.resolve(folderPath);
    const result: AuditResults = await auditProject(fullPath);
    printReportToConsole(result);

    if (result.emptyFolders.length > 0) {
      const { confirmDelete } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmDelete',
          message: `Delete ${result.emptyFolders.length} empty folders?`,
          default: false,
        },
      ]);

      if (confirmDelete) {
        for (const folder of result.emptyFolders) {
          try {
            await fs.rmdir(folder);
          } catch (error: any) {
            console.error(`Couldn't delete folder on path ${folder}. Error: ${error?.message}`);
            if (error?.message == null) {
              console.error(error);
            }
          }
        }
      } else {
        console.log(chalk.gray('No folders were deleted.'));
      }
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
