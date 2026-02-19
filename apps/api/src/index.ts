import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { projectRouter } from './routes/projects.js';
import { taskRouter } from './routes/tasks.js';
import { activityRouter } from './routes/activities.js';
import { timeEntryRouter } from './routes/timeEntries.js';
import { dashboardRouter } from './routes/dashboard.js';
import { githubRouter } from './routes/github.js';
import { notificationRouter } from './routes/notifications.js';
import { userRouter } from './routes/users.js';
import { organizationRouter } from './routes/organizations.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/projects', projectRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/activities', activityRouter);
app.use('/api/time-entries', timeEntryRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/github', githubRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/organizations', organizationRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Orion API running on http://localhost:${PORT}`);
});

export default app;
