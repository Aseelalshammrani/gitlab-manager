require('dotenv').config({ path: './.env' });
const simpleGit = require('simple-git');
const fse = require('fs-extra')// For copying files
const path = require('path')

const excludeFiles = process.env.EXCLUDE_FILES ? process.env.EXCLUDE_FILES.split(',').map(file => file.trim()) : []

const date = new Date();
const formattedDate = new Intl.DateTimeFormat('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
}).format(date)




const gatewayRepoUrl = process.env.GATEWAY_REPO_URL;
const gatewayBranch = process.env.GATEWAY_BRANCH || 'master' ;
const repoBranch =  process.env.REPO_BRANCH || 'master'

const repoNames = process.env.REPOS_NAMES.split(',')
const repoUrls = process.env.REPOS_URLS.split(',')

if(repoNames.length !== repoUrls.length){
    throw new Error('The number of repository names and URLs in the .env file do not match.')
}

// Create the repos array by combining names and URLs
const repos = repoNames.map((repoName,index)=>({
    repoName: repoName.trim(),
    repoUrl:repoUrls[index].trim()
}))


// Function to get a list of changed files in the gateway repository
async function getCommittedChangedFiles(){
    const tempGatewayDir = path.join(__dirname,'temp-gateway')
    
   try{
    await fse.ensureDir(tempGatewayDir)
    // console.log(`Cloning Gateway repository into ${tempGatewayDir}`)
    const gatewayGit = simpleGit(tempGatewayDir)
    await gatewayGit.clone(gatewayRepoUrl,tempGatewayDir)

    const branchSummary = await gatewayGit.branch();
    if(branchSummary.current !== gatewayBranch){
        await gatewayGit.checkout(gatewayBranch)
    }

    await gatewayGit.pull('origin', gatewayBranch)

    const diffSummary  = await gatewayGit.diffSummary(['HEAD~1', 'HEAD'])
    const changedFiles = diffSummary.files.map(file => file.file)

    const filteredFiles = changedFiles.filter(file => !excludeFiles.includes(file))

    console.log('Changed files:',filteredFiles)
    return filteredFiles;
   }catch(error){
    throw new Error(`Failed to get changed files: ${error.message}`)
   }
}

// Function to copy only changed files from Gateway to the target repository
async function copyChangedFilesToRepo(changedFiles,targetRepoPath,repoGit ,tempGatewayDir){
    for (const file of changedFiles){
        try{
            const sourcePath = path.join(tempGatewayDir,file)
            const targetPath = path.join(targetRepoPath,file)

            // Check if the source file still exists (it may have been deleted)
            const sourceFileExists = await fse.pathExists(sourcePath);
            
            if(!sourceFileExists){
                // If the source file was deleted, remove it from the target repo
                if(await fse.pathExists(targetPath)){
                    await fse.remove(targetPath)
                    console.log(`Deleted file ${file} from target repository`)
                    await repoGit.rm(file)
                }else{
                    console.log(`File ${file} was already deleted in both source and target, skipping...`)
                }
            }else{
                // Check if the source file and target file are different before copying
                if (await fse.pathExists(targetPath)){
                    const sourceFileContent= await fse.readFile(sourcePath)
                    const targetFileContent=await fse.readFile(targetPath)
    
                    // If files are identical, skip copying
                    if (sourceFileContent.equals(targetFileContent)){
                        console.log(`File ${file} is identical to target, skipping...`)
                        continue;
                    }
                }
                // Copy the file (either new or modified)
                await fse.copy(sourcePath, targetPath);

                // Stage the copied file
                await repoGit.add(file);
            }

        }catch(error){
            throw new Error(`Failed to copy file ${file}: ${error.message}`)
        }
    }
}



// Function to update each target repository with the changed files from Gateway
async function updateRepos() {
    const tempGatewayDir = path.join(__dirname,'temp-gateway')
    const changedFiles = await getCommittedChangedFiles(tempGatewayDir)

    if (changedFiles.length === 0) {
        console.log('No changed files to update.');
        await fse.remove(tempGatewayDir)
        return { message: 'No changed files to update.'};
    }

    for (const repo of repos) {
        const tempDir = path.join(__dirname,`temp-${repo.repoName}`)
        try {
            console.log(`Cloning ${repo.repoName}`)
            await fse.remove(tempDir); // Clean up the temp directory if it exists
            const tempRepoGit = simpleGit();
            await tempRepoGit.clone(repo.repoUrl,tempDir);

            const repoGit = simpleGit(tempDir);
            const branchSummary = await repoGit.branch()
            if(branchSummary.all.includes(`remotes/origin/${repoBranch}`)){
                console.log(`Branch '${repoBranch}' exists in ${repo.repoName}, switching to it.`)
                await repoGit.checkout(repoBranch)
                await repoGit.pull('origin', repoBranch)
            }
            else {
                console.log(`Branch '${repoBranch}' does not exist in ${repo.repoName}, creating it.`);
                await repoGit.checkoutLocalBranch(repoBranch)
                await repoGit.push(['-u', 'origin', repoBranch])
            }

            // Copy only changed files to the temporary repo directory
            await copyChangedFilesToRepo(changedFiles,tempDir,repoGit ,tempGatewayDir)

            const status = await repoGit.status()
            if(!status.isClean()){
                const commitMessage = `Update from blueprint gateway on ${formattedDate}`
                await repoGit.commit(commitMessage)
                await repoGit.push('origin',repoBranch)
                console.log(`Changes committed and pushed to ${repo.repoName}`)
            }else{
                console.log(`No changes detected for ${repo.repoName}`)
            }

        } catch (error) {
            throw new Error(`Failed to update ${repo.repoName}: ${error.message}`)
        }finally{
           try{
            await fse.remove(tempDir);// Clean up temporary directory
            console.log(`Cleaned up temporary directory for ${repo.repoName}`)
           }catch(cleanupError){
            console.error(`Failed to clean up temp directory: ${cleanupError.message}`)
           }
            
        }

    }

    try{
        await fse.remove(tempGatewayDir)
        console.log(`Cleaned up temporary directory for Gateway`)
    }catch(cleanupError){
        console.error(`Failed to clean up Gateway temp directory: ${cleanupError.message}`)
    }

    return { message: 'Repositories updated successfully.'}
}


module.exports = {
    updateRepos
};

//http://gitlab.leandevclan.com/heem-marketplace/gateways/drg.git,http://gitlab.leandevclan.com/heem-marketplace/gateways/raqeeb.git,http://gitlab.leandevclan.com/heem-marketplace/gateways/registries-organizations.git,http://gitlab.leandevclan.com/heem-marketplace/gateways/registries-practitioners.git,http://gitlab.leandevclan.com/heem-marketplace/gateways/sickleaves.git

