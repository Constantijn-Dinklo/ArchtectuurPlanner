import dotenv from "dotenv";
dotenv.config();

import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import Environment from '../models/environment.model';
import EnvironmentMember, { EnvironmentRole } from '../models/environmentMember.model';
import User, { OrganisationRole } from '../models/user.model';

// Adds test users with different role combinations to the organisation that signup uses, for trying out the management area.
// Run with `npm run seed:test-users`, and remove them again with `npm run seed:test-users -- --remove`.
// Safe to run again: existing test users are updated instead of added twice.

const ORGANISATION_ID = '6a1fcd7562e012033bbccaf6';
const PASSWORD = 'Test1234!';

// The role per environment, by the position of the environment (sorted by name). Missing positions get no membership,
// so the user counts as editor there
const TEST_USERS: { email: string, organisationRole: OrganisationRole, environmentRoles: EnvironmentRole[] }[] = [
    { email: 'test.admin@example.com', organisationRole: 'admin', environmentRoles: [] },
    { email: 'test.editor@example.com', organisationRole: 'member', environmentRoles: [] },
    { email: 'test.viewer@example.com', organisationRole: 'member', environmentRoles: ['viewer', 'viewer', 'viewer'] },
    { email: 'test.environment-admin@example.com', organisationRole: 'member', environmentRoles: ['admin', 'viewer', 'editor'] },
    { email: 'test.mixed@example.com', organisationRole: 'member', environmentRoles: ['viewer', 'admin', 'viewer'] }
];

async function seed() {
    const environments = await Environment.find({ organisationId: ORGANISATION_ID }).sort({ name: 1 });
    const password = await bcrypt.hash(PASSWORD, 10);

    for(const testUser of TEST_USERS) {
        const user = await User.findOneAndUpdate(
            { email: testUser.email },
            { $set: { password, organisationId: ORGANISATION_ID, organisationRole: testUser.organisationRole } },
            { upsert: true, returnDocument: 'after' }
        );

        await EnvironmentMember.deleteMany({ userId: user._id });
        const roles = environments.map((environment, index) => {
            const role = testUser.environmentRoles[index];
            if(!role) return `${environment.name}: editor (no membership)`;
            return EnvironmentMember.create({ environmentId: environment._id, userId: user._id, role })
                .then(() => `${environment.name}: ${role}`);
        });
        console.log(`${testUser.email} (${testUser.organisationRole}) → ${(await Promise.all(roles)).join(', ') || 'no environments'}`);
    }
    console.log(`\nPassword for all test users: ${PASSWORD}`);
}

async function remove() {
    const users = await User.find({ email: { $in: TEST_USERS.map((testUser) => testUser.email) } });
    await EnvironmentMember.deleteMany({ userId: { $in: users.map((user) => user._id) } });
    await User.deleteMany({ _id: { $in: users.map((user) => user._id) } });
    console.log(`Removed ${users.length} test user(s)`);
}

async function main() {
    if(!process.env.MONGO_URI) throw new Error('MONGO_URI is missing in .env');
    await mongoose.connect(process.env.MONGO_URI);
    try {
        await (process.argv.includes('--remove') ? remove() : seed());
    }
    finally {
        await mongoose.disconnect();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
