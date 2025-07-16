const express = require('express');
const {Queue , QueueEvents} = require('bullmq');

const app = express();
const port = 3000;

app.use(express.json());

const redisConnection = {
    host: 'localhost',
    port: 6379,
};

// Setup Queue
const verifyUser = new Queue('verifyUser', { connection: redisConnection });
const verificationQueueEvents = new QueueEvents('verifyUser', { connection: redisConnection });

const mailQueue = new Queue('mailQueue', { connection: redisConnection });
const mailQueueEvents = new QueueEvents('mailQueue', { connection: redisConnection });


// Replace checkUserVerification with a version that uses waitUntilFinished
const checkUserVerification = async (job) => {
    try {
        const result = await job.waitUntilFinished(verificationQueueEvents);
        return result;
    } catch (err) {
        return { isValidUser: false, rest: null };
    }
};

function waitForMailJob(jobId) {
    return new Promise((resolve, reject) => {
        const onCompleted = ({ jobId: completedJobId, returnValue }) => {
            if (jobId === completedJobId) {
                mailQueueEvents.off('completed', onCompleted);
                mailQueueEvents.off('failed', onFailed);
                resolve(returnValue);
            }
        };
        const onFailed = ({ jobId: failedJobId, error }) => {
            if (jobId === failedJobId) {
                mailQueueEvents.off('completed', onCompleted);
                mailQueueEvents.off('failed', onFailed);
                reject(error);
            }
        };
        mailQueueEvents.on('completed', onCompleted);
        mailQueueEvents.on('failed', onFailed);
    });
}

app.post('/order', async (req, res) => {
    try {
        const { orderId, productName, price, userId } = req.body;
        const job = await verifyUser.add('verifyUser', { userId }, { removeOnComplete: false });

        let { isValidUser, rest } = await checkUserVerification(job);
        
        if (!isValidUser || !rest) {
            return res.send({
                message: 'User is not Valid',
            });

        }

        const mailJob = await mailQueue.add('Send Email', {
            from: 'admin@gmail.com',
            to: rest.email,
            subject: 'Order Confirmation',
            text: `Your order has been confirmed ${orderId}`,
        });
        let mailResult;
        try {
            mailResult = await waitForMailJob(mailJob.id);
        } catch (e) {
            mailResult = { success: false };
        }

        res.send({
            message: 'User is Valid',
            mailStatus: mailResult && mailResult.success ? 'Email sent' : 'Email failed',
            rest
        });

    } catch (error) {
        res.status(500).send('Error processing order');
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});





