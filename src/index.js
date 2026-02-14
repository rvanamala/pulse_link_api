require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const protectedRoutes = require('./routes/protected');
const subscribersRoutes = require('./routes/subscribers');
const usersRoutes = require('./routes/users');
const devicesRoutes = require('./routes/devices');
const userDeviceAssignmentsRoutes = require('./routes/userDeviceAssignments');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/subscribers', subscribersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/assignments', userDeviceAssignmentsRoutes);
app.use('/', protectedRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
