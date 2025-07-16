const express = require('express');
const { Queue, Worker } = require('bullmq');


const app = express();
const port = 3001;


app.use(express.json());


const userDB = [
    {
        id: 1,
        name: 'John Doe',
        password: '123456',
        email: 'john@doe.com',
    },
    {
        id: 2,
        name: 'TOM',
        password: '98765',
        email: 'tom@doe.com',
    },

]

// Create a Queue instance
const verifyQueue = new Queue('verifyUser', {
    connection: {
        host: '127.0.0.1',
        port: 6379,
    },
});

// POST endpoint to add a job to the queue
app.post('/verify', async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }
    const job = await verifyQueue.add('verify', { userId });
    res.json({ jobId: job.id });
});


const verificationWorker = new Worker('verifyUser', (job) => {
    const userId = Number(job.data.userId); // Ensure userId is a number
    console.log(`The received userid is ${userId} and job id is ${job.id}`);
    const user = userDB.find((item) => item.id === userId);
    console.log('User found:', user);
    const isValidUser = !!user;
    if (user) {
        const { password, ...rest } = user;
        console.log('Worker returning:', { isValidUser, rest });
        return { isValidUser, rest };
    } else {
        console.log('Worker returning:', { isValidUser: false, rest: null });
        return { isValidUser: false, rest: null };
    }
}, {
    connection: {
        host: 'localhost',
        port: 6379,
    },
});



app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});