import { Command } from "commander";
import pkgJson from "../package.json";
import path from "path";
import { auditProject, AuditResults } from "./auditor";
import inquirer from "inquirer";
import fs from "fs-extra";
import chalk from "chalk";


function printReport(result: AuditResults) {
  console.log(chalk.yellow('\nProject Audit Report:\n'));

  const checks: { 
    label: string; 
    isOk: boolean; 
    details?: string[]; 
    okMessage?: string 
  }[] = [
    {
      label: '.env.example found without .env file',
      isOk: !result.unusedEnvExample,
      okMessage: '.env.example usage OK',
    },
    {
      label: 'Empty folders detected',
      isOk: result.emptyFolders.length === 0,
      details: result.emptyFolders,
      okMessage: 'No empty folders',
    },
    {
      label: 'Multiple README files detected',
      isOk: result.duplicatedReadmeFiles.length === 0,
      details: result.duplicatedReadmeFiles,
      okMessage: 'README files OK',
    },
    {
      label: 'Multiple .gitignore files detected',
      isOk: result.duplicatedGitIgnoreFiles.length === 0,
      details: result.duplicatedGitIgnoreFiles,
      okMessage: '.gitignore files OK',
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

async function main() {
    const program = new Command();

    program
        .name(pkgJson.name)
        .description(pkgJson.description)
        .version(pkgJson.version)
        .parse();

    try {
        const { folderPath } = await inquirer.prompt([
            {
                type: 'input',
                name: 'folderPath',
                message: 'Please enter the path of the project folder to audit:',
                default:'.',
                validate: (input) => {
                    if(fs.existsSync(input) && fs.lstatSync(input).isDirectory()){
                        return true;
                    }
                    else {
                        return 'Folder does not exist or is not a directory'
                    }
                }
            }
        ]);

        const fullPath = path.resolve(folderPath);console.log(fullPath);
        const result = await auditProject(fullPath);
        printReport(result);

        if(result.emptyFolders.length > 0){
            const { confirmDelete } = await inquirer.prompt([
                {
                    type:'confirm',
                    name:'confirmDelete',
                    message:`Delete ${result.emptyFolders.length} empty folders?`,
                    default: false
                }
            ]);

            if(confirmDelete){
                for(const folder of result.emptyFolders){
                    try {
                        await fs.rmdir(folder);
                    } catch (error: any) {
                        console.error(`Couldn't delete folder on path ${folder}. Error: ${error?.message}`);
                        if(error?.message == null){
                            console.error(error);
                        }
                    }
                }
            }
            else {
                console.log(chalk.gray('No folders were deleted.'));
            }
        }
    } catch (err: any) {
        console.error(err);
        process.exit(1);
    }
}

main();