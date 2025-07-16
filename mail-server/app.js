const express = require('express');
const {Worker} = require('bullmq');

const app = express();
const port = 3002;


app.use(express.json());

async function sendEmail(from, to, subject, text) {
    console.log(`The email is sent from ${from} to ${to} with subject ${subject} and text ${text}`);
    // Here you would integrate with a real email service
    return true;
}

const mailWorker = new Worker('mailQueue', async (job) => {
    const { from, to, subject, text } = job.data;
    try {
        const result = await sendEmail(from, to, subject, text);
        return { success: result };
    } catch (err) {
        return { success: false };
    }
}, {
    connection: {
        host: 'localhost',
        port: 6379,
    },
});

app.listen(port, () => {
    console.log(`Mail Server is running on port ${port}`);
});