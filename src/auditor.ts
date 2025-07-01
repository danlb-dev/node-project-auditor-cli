import { 
    checkForDuplicatedTypeFiles, 
    checkForEmptyFolders, 
    checkForEnvExWithoutEnv, 
    checkForMultipleLockFiles, 
    checkForUnstagedFiles 
} from "./auditorHelper";

export interface AuditResults {
    emptyFolders: string[];
    unusedEnvExample: boolean,
    multipleLockFiles: string[];
    duplicatedReadmeFiles: string[];
    duplicatedGitIgnoreFiles: string[];
    unstagedFiles: string[];
    unusedFiles: string[];
}

export enum FileTypes {
    readme = ".md",
    gitIgnore = ".gitignore",
}

export async function auditProject(dir: string): Promise<AuditResults> {
    const auditResults: AuditResults = {
        emptyFolders: [],
        unusedEnvExample: false,
        multipleLockFiles: [],
        duplicatedReadmeFiles: [],
        duplicatedGitIgnoreFiles: [],
        unstagedFiles: [],
        unusedFiles: []
    }

    //'auditResults' is a reference type variable 
    // and it will be updated after running the functions below.

    await checkForEmptyFolders(dir, auditResults);
    await checkForEnvExWithoutEnv(dir, auditResults);
    await checkForMultipleLockFiles(dir, auditResults);
    await checkForDuplicatedTypeFiles(dir, FileTypes.readme, auditResults);
    await checkForDuplicatedTypeFiles(dir, FileTypes.gitIgnore, auditResults);
    await checkForUnstagedFiles(dir, auditResults);

    return auditResults;
}