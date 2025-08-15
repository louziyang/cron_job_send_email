// send-email.js
import nodemailer from 'nodemailer';

const main = async () => {
    // 从 GitHub Secrets 中读取环境变量
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    const toEmail = process.env.TO_EMAIL || 'recipient@example.com'; // 默认收件人

    if (!user || !pass) {
        console.error('Missing GMAIL_USER or GMAIL_APP_PASSWORD secrets.');
        process.exit(1);
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
    });

    const mailOptions = {
        from: user,
        to: toEmail,
        subject: 'GitHub Actions 自动发送的邮件',
        text: `这是一封由 GitHub Actions 在 ${new Date().toLocaleString()} 触发的邮件。`,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('邮件发送成功:', info.response);
    } catch (error) {
        console.error('邮件发送失败:', error);
        process.exit(1);
    }
};

main();
