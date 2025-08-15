// run-task.js
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'; // 用于执行外部命令

// GitHub API 相关配置
const GITHUB_API_URL = 'https://api.github.com';
const REPO_OWNER = process.env.GITHUB_REPOSITORY.split('/')[0]; // 从GITHUB_REPOSITORY环境变量中获取所有者
const REPO_NAME = process.env.GITHUB_REPOSITORY.split('/')[1];  // 从GITHUB_REPOSITORY环境变量中获取仓库名称
const REPO_PAT = process.env.REPO_PAT; // 从GitHub Secrets中获取的PAT
const LAST_RUN_VARIABLE_NAME = 'LAST_TASK_RUN_TIMESTAMP'; // GitHub Repository Variable 的名称

// 获取当前运行的 Node.js 解释器的路径
const nodeExecutable = process.execPath; 

// 您要执行的主要任务的命令
const SCRIPT_TO_RUN = path.join(__dirname, 'main.js');

console.log(`尝试使用 '${nodeExecutable}' 运行 '${SCRIPT_TO_RUN}'...`);

const DAYS_INTERVAL = 1; // 运行间隔天数

/**
 * 从 GitHub Repository Variable 获取上次运行时间戳
 * @returns {Promise<number>} 上次运行的时间戳（毫秒），如果未找到则为0
 */
async function getGitHubVariable() {
    if (!REPO_PAT) {
        console.error('错误: REPO_PAT 环境变量未设置。无法获取 GitHub Variable。');
        return 0;
    }

    const url = `${GITHUB_API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/actions/variables/${LAST_RUN_VARIABLE_NAME}`;
    try {
        // 使用已赋值的 fetch 函数
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `token ${REPO_PAT}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Node.js Script for GitHub Actions', // 推荐设置User-Agent
            },
        });

        if (response.ok) {
            const data = await response.json();
            const value = parseInt(data.value, 10);
            return isNaN(value) ? 0 : value; // 如果解析失败，返回0
        } else {
            const errorText = await response.text();
            console.error(`获取 GitHub Variable 失败: ${response.status} - ${errorText}`);
            return 0; // 获取失败，视为首次运行
        }
    } catch (error) {
        console.error(`获取 GitHub Variable 时发生网络错误: ${error.message}`);
        return 0; // 发生错误，视为首次运行
    }
}

/**
 * 更新 GitHub Repository Variable 中的上次运行时间戳
 * @param {number} timestamp 要写入的时间戳（毫秒）
 * @returns {Promise<boolean>} 更新是否成功
 */
async function updateGitHubVariable(timestamp) {
    if (!REPO_PAT) {
        console.error('错误: REPO_PAT 环境变量未设置。无法更新 GitHub Variable。');
        return false;
    }

    const url = `${GITHUB_API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/actions/variables/${LAST_RUN_VARIABLE_NAME}`;
    try {
        // 使用已赋值的 fetch 函数
        const response = await fetch(url, {
            method: 'PATCH', // 使用 PATCH 方法更新现有变量
            headers: {
                'Authorization': `token ${REPO_PAT}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Node.js Script for GitHub Actions',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: LAST_RUN_VARIABLE_NAME,
                value: timestamp.toString(), // 将时间戳转换为字符串
            }),
        });

        if (response.ok) {
            console.log(`成功更新 GitHub Variable '${LAST_RUN_VARIABLE_NAME}' 为 ${timestamp}`);
            return true;
        } else {
            const errorText = await response.text();
            console.error(`更新 GitHub Variable 失败: ${response.status} - ${errorText}`);
            return false;
        }
    } catch (error) {
        console.error(`更新 GitHub Variable 时发生网络错误: ${error.message}`);
        return false;
    }
}


/**
 * 检查并运行任务的主函数
 */
const runTask = async () => {
    const { default: fetch } = await import('node-fetch');
    const CURRENT_RUN_TIMESTAMP = Date.now(); 
    const CURRENT_RUN_DATE_STR = new Date(CURRENT_RUN_TIMESTAMP).toLocaleString();

    // 从 GitHub Repository Variable 中获取上次运行时间戳
    let lastRunTimestamp = await getGitHubVariable();
    if (lastRunTimestamp === 0) {
        console.log('GitHub Variable 中未找到上次运行时间，或获取失败，将视为首次运行。');
    }

    // 计算从上次运行到当前的天数差
    const daysDiff = Math.floor((CURRENT_RUN_TIMESTAMP - lastRunTimestamp) / (1000 * 60 * 60 * 24));

    console.log(`上次任务完成时间 (从GitHub Variable获取): ${lastRunTimestamp ? new Date(lastRunTimestamp).toLocaleString() : 'N/A'}`);
    console.log(`本次任务运行时间: ${CURRENT_RUN_DATE_STR}`);
    console.log(`距离上次任务完成已过 ${daysDiff} 天。`);

    // 判断是否达到运行间隔
    if (daysDiff >= DAYS_INTERVAL) {
        console.log(`已达到或超过 ${DAYS_INTERVAL} 天间隔，开始执行主要任务...`);
        
        exec(`${nodeExecutable} ${SCRIPT_TO_RUN}`, async (error, stdout, stderr) => { 
            if (error) {
                console.error(`执行主要任务时出错: ${error.message}`);
                // 如果任务失败，不更新 GitHub Variable
                return;
            }
            if (stderr) {
                console.error(`主要任务标准错误输出: ${stderr}`);
            }
            console.log(`主要任务标准输出:\n${stdout}`);
            
            // 任务成功执行后，更新 GitHub Repository Variable 中的上次运行时间
            const updateSuccess = await updateGitHubVariable(CURRENT_RUN_TIMESTAMP);
            if (updateSuccess) {
                console.log(`任务完成，已成功更新 GitHub Repository Variable 中的时间戳到 ${CURRENT_RUN_DATE_STR}。`);
            } else {
                console.error('任务完成，但未能更新 GitHub Repository Variable。请检查日志。');
            }
        });

    } else {
        console.log(`距离上次任务完成只过了 ${daysDiff} 天，不足 ${DAYS_INTERVAL} 天，跳过本次运行。`);
    }
};

// 启动任务检查流程
runTask();
