import { Types } from "mongoose";
import { hasEnvironmentAccess, UserJwtPayload } from "../middelware";
import Environment from "../models/environment.model";
import EnvironmentMember from "../models/environmentMember.model";
import Organisation from "../models/organisatie.model";
import User from "../models/user.model";
import View from "../models/canvas/view.model";

// Creates an environment owned by the organisation of the user, with the user as its admin and a first view
export async function createEnvironment(user: Pick<UserJwtPayload, 'id' | 'organisationId'>, name: string) {
    if(!name?.trim()) {
        throw new Error("An environment needs a name");
    }

    const environment = new Environment({
        organisationId: user.organisationId,
        name: name.trim(),
        createdBy: user.id ?? null
    });
    await environment.save();

    if(user.id) {
        await new EnvironmentMember({
            environmentId: environment._id,
            userId: user.id,
            role: 'admin',
            addedBy: user.id
        }).save();
    }

    // The canvas always shows a view, so a new environment starts with one
    await new View({
        environmentId: environment._id,
        name: 'Main view'
    }).save();

    return environment;
}

// All environments the user can work in: those of its own organisation and those it was added to
export async function getAccessibleEnvironments(user: UserJwtPayload) {
    // A user of an organisation without any environment gets a first one, so there is always something to work in
    const ownCount = await Environment.countDocuments({ organisationId: user.organisationId });
    if(ownCount === 0) {
        await createEnvironment(user, 'Main environment');
    }

    const memberships = await EnvironmentMember.find({ userId: user.id });
    const environments = await Environment.find({
        $or: [
            { organisationId: user.organisationId },
            { _id: { $in: memberships.map((membership) => membership.environmentId) } }
        ]
    }).sort({ name: 1 });

    const organisations = await Organisation.find({
        _id: { $in: [...new Set(environments.map((environment) => environment.organisationId.toString()))] }
    });
    const organisationNames = new Map(organisations.map((organisation) => [organisation._id.toString(), organisation.name]));

    return environments.map((environment) => ({
        id: environment._id.toString(),
        name: environment.name,
        organisationId: environment.organisationId.toString(),
        organisationName: organisationNames.get(environment.organisationId.toString()) ?? 'Unknown organisation',
        isOwnOrganisation: environment.organisationId.toString() === user.organisationId?.toString(),
        role: memberships.find((membership) => membership.environmentId.toString() === environment._id.toString())?.role ?? 'editor'
    }));
}

async function requireAccess(user: UserJwtPayload, environmentId: string) {
    if(!(await hasEnvironmentAccess(user, environmentId))) {
        throw new Error("No access to this environment");
    }
    const environment = await Environment.findById(environmentId);
    if(!environment) {
        throw new Error("Environment not found");
    }
    return environment;
}

// The added members of an environment. Users of the owning organisation have access without being listed here
export async function getEnvironmentMembers(user: UserJwtPayload, environmentId: string) {
    const environment = await requireAccess(user, environmentId);

    const memberships = await EnvironmentMember.find({ environmentId });
    const users = await User.find({ _id: { $in: memberships.map((membership) => membership.userId) } });
    const organisations = await Organisation.find({
        _id: { $in: [...new Set(users.map((member) => member.organisationId.toString()))] }
    });

    const owningOrganisation = await Organisation.findById(environment.organisationId);

    return {
        owningOrganisationName: owningOrganisation?.name ?? 'Unknown organisation',
        members: memberships.map((membership) => {
            const member = users.find((candidate) => candidate._id.toString() === membership.userId.toString());
            const organisation = organisations.find((candidate) => candidate._id.toString() === member?.organisationId.toString());
            return {
                id: membership._id.toString(),
                userId: membership.userId.toString(),
                email: member?.email ?? 'Unknown user',
                organisationName: organisation?.name ?? 'Unknown organisation',
                isExternal: member?.organisationId.toString() !== environment.organisationId.toString(),
                role: membership.role
            };
        })
    };
}

// Gives an existing user access to the environment, for example a consultant of another organisation
export async function addEnvironmentMember(user: UserJwtPayload, environmentId: string, email: string) {
    const environment = await requireAccess(user, environmentId);

    const member = await User.findOne({ email: email?.trim() });
    if(!member) {
        throw new Error("There is no user with this e-mail address");
    }

    await EnvironmentMember.updateOne(
        { environmentId, userId: member._id },
        {
            $setOnInsert: {
                environmentId: environment._id,
                userId: member._id,
                role: 'editor',
                addedBy: new Types.ObjectId(user.id)
            }
        },
        { upsert: true }
    );

    return getEnvironmentMembers(user, environmentId);
}

export async function removeEnvironmentMember(user: UserJwtPayload, environmentId: string, memberId: string) {
    await requireAccess(user, environmentId);
    await EnvironmentMember.deleteOne({ _id: memberId, environmentId });
    return getEnvironmentMembers(user, environmentId);
}
