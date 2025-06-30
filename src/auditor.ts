import fs from "fs-extra";
import path from "path";
import simpleGit, { FileStatusResult, SimpleGit, StatusResult } from "simple-git";

const README_REGEX:RegExp = /^README(?:\.md)?$/i;
const GITIGNORE_REGEX:RegExp = /^\.gitignore$/i;
const FOLDERS_TO_IGNORE:string[] = [".git", "dist", "node_modules"];

export interface AuditResults {
    emptyFolders: string[];
    unusedEnvExample: boolean,
    duplicatedReadmeFiles: string[];
    duplicatedGitIgnoreFiles: string[];
    unstagedFiles: string[];
    unusedFiles: string[];
}

enum FileTypes {
    readme = ".md",
    gitIgnore = ".gitignore",
}

export async function auditProject(dir: string): Promise<AuditResults> {
    const auditResults: AuditResults = {
        emptyFolders: [],
        unusedEnvExample: false,
        duplicatedReadmeFiles: [],
        duplicatedGitIgnoreFiles: [],
        unstagedFiles: [],
        unusedFiles: []
    }

    //'auditResults' is a reference type variable 
    // and it will be updated after running the fucntions below.

    await checkForEmptyFolders(dir, auditResults);
    await checkForEnvExWithoutEnv(dir, auditResults);
    await checkForDuplicatedTypeFiles(dir, FileTypes.readme, auditResults);
    await checkForDuplicatedTypeFiles(dir, FileTypes.gitIgnore, auditResults);
    await checkForUnstagedFiles(dir, auditResults);

    return auditResults;
}

//#region private functions
async function checkForEmptyFolders(folderPath: string, auditResults: AuditResults): Promise<void> {
    try {
        const entries = await fs.readdir(folderPath, { withFileTypes: true });
        if(entries.length == 0){
            auditResults.emptyFolders.push(folderPath);
        }
        else {
            const directories = entries.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
            for(const dir of directories){
                if(!FOLDERS_TO_IGNORE.includes(dir.toLowerCase())){
                    const dirPath = path.join(folderPath, dir);
                    await checkForEmptyFolders(dirPath, auditResults);
                }
            }
        }
    } catch (error) {
        console.error(error);
    }
}

async function checkForEnvExWithoutEnv(folderPath: string, auditResults: AuditResults): Promise<void> {
    const envExample = path.join(folderPath, '.env.example');
    const env = path.join(folderPath, '.env');

    if(await fs.existsSync(envExample) && !await fs.existsSync(env)){
        auditResults.unusedEnvExample = true;
    }
    else {
        const entries = (await fs.readdir(folderPath, { withFileTypes: true }))
        .filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

        if(entries.length > 0){
            for(const dir of entries){
                if(!FOLDERS_TO_IGNORE.includes(dir.toLowerCase())){
                    const dirPath = path.join(folderPath, dir);
                    await checkForEnvExWithoutEnv(dirPath, auditResults);
                }
            }
        }
    }
}

async function checkForDuplicatedTypeFiles(folderPath: string, fileType: FileTypes, auditResults: AuditResults): Promise<void> {
    const duplicates: string[] = [];
    
    try {
        const entries = await fs.readdir(folderPath, { withFileTypes: true });

        for(let i=0; i < entries.length; i++){
            if(FOLDERS_TO_IGNORE.includes(entries[i].name.toLowerCase())){
                continue;
            }

            const entryPath = path.join(folderPath, entries[i].name);
            const regexToUse = (fileType == FileTypes.readme) ? README_REGEX : GITIGNORE_REGEX;

            if(entries[i].isFile() && regexToUse.test(entries[i].name)){
                duplicates.push(entryPath);
            }
            else if(entries[i].isDirectory()){
                await checkForDuplicatedTypeFiles(entryPath, fileType, auditResults);
            }
        }

        if(duplicates.length > 1){
            if(fileType == FileTypes.readme){
                auditResults.duplicatedReadmeFiles.push(...duplicates);
            }
            else if(fileType == FileTypes.gitIgnore){
                auditResults.duplicatedGitIgnoreFiles.push(...duplicates);
            }
        }
    } catch (error) {
        console.error(error);
    }
}

async function checkForUnstagedFiles(dir: string, auditResults: AuditResults): Promise<void> {
  const git:SimpleGit = simpleGit(dir);
  const status:StatusResult = await git.status();
  const files: FileStatusResult[] = status.files;

  if(files.length > 0){
    files.forEach(fileStatusResult => {
        if(fileStatusResult.working_dir == 'M'){
            auditResults.unstagedFiles.push(fileStatusResult.path);
        }
    });
  }
}
//#endregion