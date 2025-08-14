// run-task.js
const fs = require('fs'); // 用于文件系统操作
const path = require('path'); // 用于处理文件路径
const { exec } = require('child_process'); // 用于执行外部命令

// 存储上次运行日期的时间戳文件路径
// 建议将其放置在您的项目目录中
const LAST_RUN_FILE = path.join(__dirname, 'last_run.txt');

// 您要执行的主要任务的命令
// 它可以是一个shell脚本，另一个Node.js文件，或者任何可执行命令
// 获取当前运行的 Node.js 解释器的路径
const nodeExecutable = process.execPath; 
// 示例：一个名为 main_task.sh 的shell脚本
const SCRIPT_TO_RUN = path.join(__dirname, 'main.js');

console.log(`尝试使用 '${nodeExecutable}' 运行 '${SCRIPT_TO_RUN}'...`);

const DAYS_INTERVAL = 1; // 设置任务运行的间隔天数

/**
 * 检查并运行任务的主函数
 */
const runTask = async () => {
    let lastRunTimestamp = 0; // 默认为0，表示从未运行过

    try {
        // 尝试读取上次运行的时间戳
        const lastRunData = fs.readFileSync(LAST_RUN_FILE, 'utf8');
        // 将读取到的字符串转换为整数
        lastRunTimestamp = parseInt(lastRunData, 10);
        // 验证时间戳是否有效
        if (isNaN(lastRunTimestamp)) {
            lastRunTimestamp = 0; // 如果无效，重置为0
            console.warn('读取到的上次运行时间戳无效，将视为首次运行。');
        }
    } catch (error) {
        // 如果文件不存在或读取失败，这意味着是第一次运行
        console.log('上次运行文件不存在或无法读取，将进行首次运行判断。');
        // lastRunTimestamp 保持为0，任务会立即运行
    }

    // 获取当前时间戳（毫秒）
    const currentTimestamp = Date.now();

    // 计算从上次运行到当前的天数差
    // 1000 毫秒/秒 * 60 秒/分 * 60 分/小时 * 24 小时/天 = 每天的毫秒数
    const daysDiff = Math.floor((currentTimestamp - lastRunTimestamp) / (1000 * 60 * 60 * 24));

    console.log(`上次运行时间: ${lastRunTimestamp ? new Date(lastRunTimestamp).toLocaleString() : 'N/A'}`);
    console.log(`当前时间: ${new Date(currentTimestamp).toLocaleString()}`);
    console.log(`距离上次运行已过 ${daysDiff} 天。`);

    // 判断是否达到运行间隔
    if (daysDiff >= DAYS_INTERVAL) {
        console.log(`已达到或超过 ${DAYS_INTERVAL} 天间隔，开始执行主要任务...`);
        
        // 使用 child_process.exec 执行外部命令
        // 注意：COMMAND_TO_RUN 必须是可执行的，并且路径正确
        exec(`${nodeExecutable} ${SCRIPT_TO_RUN}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`执行主要任务时出错: ${error.message}`);
                return; // 如果任务失败，不更新时间戳
            }
            if (stderr) {
                console.error(`主要任务标准错误输出: ${stderr}`);
            }
            console.log(`主要任务标准输出:\n${stdout}`);
            
            // 任务成功执行后，更新上次运行的时间戳为当前时间
            try {
                fs.writeFileSync(LAST_RUN_FILE, currentTimestamp.toString(), 'utf8');
                console.log(`任务完成，已成功更新上次运行时间戳到 ${new Date(currentTimestamp).toLocaleString()}。`);
            } catch (writeError) {
                console.error(`写入上次运行文件失败: ${writeError.message}`);
            }
        });

    } else {
        console.log(`距离上次运行只过了 ${daysDiff} 天，不足 ${DAYS_INTERVAL} 天，跳过本次运行。`);
    }
};

// 启动任务检查流程
runTask();
