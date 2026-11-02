import { Types } from "mongoose";
import { UserJwtPayload } from "../middelware";
import Environment from "../models/environment.model";
import EnvironmentMember, { ENVIRONMENT_ROLES, EnvironmentRole } from "../models/environmentMember.model";
import Organisation from "../models/organisatie.model";
import User, { ORGANISATION_ROLES, OrganisationRole } from "../models/user.model";

// The users of the organisation of the user, with their organisation role and their role in each environment of that organisation.
// An admin of the organisation is admin in every environment. A member without a membership has access
// through the organisation and counts as editor, like getAccessibleEnvironments does
export async function getOrganisationUsers(user: UserJwtPayload) {
    const organisation = await Organisation.findById(user.organisationId);
    const environments = await Environment.find({ organisationId: user.organisationId }).sort({ name: 1 });
    const users = await User.find({ organisationId: user.organisationId }).sort({ email: 1 });
    const memberships = await EnvironmentMember.find({
        environmentId: { $in: environments.map((environment) => environment._id) },
        userId: { $in: users.map((member) => member._id) }
    });

    return {
        organisationName: organisation?.name ?? 'Unknown organisation',
        // Lets the frontend show the role controls only to admins
        currentUserId: user.id,
        users: users.map((member) => ({
            id: member._id.toString(),
            email: member.email,
            organisationRole: member.organisationRole,
            environments: environments.map((environment) => ({
                id: environment._id.toString(),
                name: environment.name,
                role: member.organisationRole === 'admin'
                    ? 'admin'
                    : memberships.find((membership) =>
                        membership.environmentId.toString() === environment._id.toString()
                        && membership.userId.toString() === member._id.toString()
                    )?.role ?? 'editor'
            }))
        }))
    };
}

// Changes the organisation role of a user of the same organisation. The last admin cannot become a member,
// so an organisation always has someone to manage it
export async function updateOrganisationRole(user: UserJwtPayload, userId: string, organisationRole: OrganisationRole) {
    if(!ORGANISATION_ROLES.includes(organisationRole)) {
        throw new Error("Unknown organisation role");
    }

    const member = await User.findOne({ _id: userId, organisationId: user.organisationId });
    if(!member) {
        throw new Error("User not found");
    }

    if(member.organisationRole === 'admin' && organisationRole !== 'admin') {
        const adminCount = await User.countDocuments({ organisationId: user.organisationId, organisationRole: 'admin' });
        if(adminCount <= 1) {
            throw new Error("The organisation needs at least one admin");
        }
    }

    member.organisationRole = organisationRole;
    await member.save();

    return getOrganisationUsers(user);
}

// Changes the role of a user of the organisation in one environment of the organisation.
// An organisation admin is admin in every environment, so its role cannot be changed per environment
export async function updateEnvironmentRole(user: UserJwtPayload, userId: string, environmentId: string, role: EnvironmentRole) {
    if(!ENVIRONMENT_ROLES.includes(role)) {
        throw new Error("Unknown environment role");
    }

    const member = await User.findOne({ _id: userId, organisationId: user.organisationId });
    if(!member) {
        throw new Error("User not found");
    }
    if(member.organisationRole === 'admin') {
        throw new Error("An admin of the organisation is admin in every environment");
    }

    const environment = await Environment.findOne({ _id: environmentId, organisationId: user.organisationId });
    if(!environment) {
        throw new Error("Environment not found");
    }

    await EnvironmentMember.updateOne(
        { environmentId: environment._id, userId: member._id },
        {
            $set: { role },
            $setOnInsert: { addedBy: new Types.ObjectId(user.id) }
        },
        { upsert: true }
    );

    return getOrganisationUsers(user);
}
