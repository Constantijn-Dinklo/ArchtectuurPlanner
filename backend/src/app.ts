import express from "express";
import cors from "cors";
import cookieParser from 'cookie-parser';

import connectDB from './config/db';
import { authenticateToken, requireEnvironment } from './middelware';
import environmentRoutes from './routes/environmentRoutes';

import orgRoutes from './routes/organisationRoutes';
import authRoutes from './routes/auth';
import applicationRoutes from './routes/resources/applicationRoutes';
import databaseRoutes from './routes/resources/databaseRoutes';
import fileLocationsRoutes from './routes/resources/fileLocationRoutes';
import serverRoutes from './routes/resources/serverRoutes';
import tableRoutes from './routes/resources/tableRoutes';
import externalRoutes from './routes/resources/externalRoutes';
import apiRoutes from './routes/apiRoutes';
import apiConnectionRoutes from './routes/apiConnectionRoutes';
import databaseConnectionRoutes from './routes/databaseConnectionRoutes';
import scriptRoutes from './routes/scriptRoutes';
import otherConnectionRoutes from './routes/otherConnectionRoutes';
import endpointRoutes from './routes/endpointRoutes';
import informationObjectRoutes from './routes/informationObjectRoutes';
import informationRelationRoutes from './routes/informationRelationRoutes';
import componentRoutes from './routes/componentRoutes';


import viewRoutes from './routes/canvas/viewRoutes';

const app = express();

// ✅ Connect to the database
connectDB();

// ✅ Middleware
app.use(cookieParser());
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-Environment-Id'],
  })
);
app.use(express.json());


app.get('/test', (req, res) => {
  res.send('HELLO FROM MY EXPRESS APP')
})

app.use('/org', orgRoutes);
app.use('/auth', authRoutes);

// ** Environments ** //
app.use('/environments', environmentRoutes);

// All architecture data belongs to an environment: these routes need the X-Environment-Id header
// and only work for users with access to that environment. Logging in is checked here once, so the
// routers themselves do not use authenticateToken. Public routes are mounted without inEnvironment
const inEnvironment = [authenticateToken, requireEnvironment];

// ** Resources ** //
app.use('/applications', inEnvironment, applicationRoutes);
app.use('/databases', inEnvironment, databaseRoutes);
app.use('/fileLocations', inEnvironment, fileLocationsRoutes);
app.use('/servers', inEnvironment, serverRoutes);
app.use('/tables', inEnvironment, tableRoutes);
app.use('/externals', inEnvironment, externalRoutes);

// ** Components: the parts of a resource (scripts, files) ** //
app.use('/components', inEnvironment, componentRoutes);

app.use('/apis', inEnvironment, apiRoutes);

// ** Information ** //
app.use('/informationObjects', inEnvironment, informationObjectRoutes);
app.use('/informationRelations', inEnvironment, informationRelationRoutes);
app.use('/endpoints', inEnvironment, endpointRoutes);

// ** Connections ** //
app.use('/apiConnections', inEnvironment, apiConnectionRoutes);
app.use('/databaseConnections', inEnvironment, databaseConnectionRoutes);
app.use('/scripts', inEnvironment, scriptRoutes);
app.use('/otherConnections', inEnvironment, otherConnectionRoutes);


app.use('/views', inEnvironment, viewRoutes);

export default app;