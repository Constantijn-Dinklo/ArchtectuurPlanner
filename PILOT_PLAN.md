# Pilot plan

Goal: test ArchitectuurPlanner in a real environment with a small pilot: one organisation, a handful of people, and the real architecture of one domain.

Work through the steps in order and tick items off as they are done. Marked *(unchecked)* means the point is a judgement or was not confirmed in the code, so check it first. What was done before 2026-11-25 (permissions and roles, the connections and relations redesign, scripts, files and tables as ends) is in the git history.

## The model

Three things make up the landscape:

- **Resources**: everything in the landscape, each inside a parent: servers, applications, databases, file locations, external elements, scripts, files, tables, and later endpoints. Some resources **hold information** (fields and objects), some **hold other resources**, and some both
- **Connections**: a directed link from one resource to another, saying *how* information can get there: through an API, a database connection, a file, by hand, or `unknown`
- **Relations**: one information field or object going from one resource that holds information to another, always through one connection

All rules about what a resource can do come from **one type table** (`RESOURCE_TYPES`), not from checks per type in the code.

### The resource types

| Type | Inside | Holds information | A connection to it ends at |
|---|---|---|---|
| Server | nothing | no | never: a server is never an end |
| Application | a server | `input`, `output` | the application |
| Script | an application or a file location | `input`, `output` | the script |
| Database | a server | no | the database (for its tables) |
| Table | a database | `contains` | its database from outside, the table from inside the database |
| File location | a server | no | the file location (for its files) |
| File | a file location | `contains` | its file location from outside, the file from inside the file location |
| External element | nothing | `provides`, `receives` | the external element |
| Endpoint (later) | an application | `receives` | no connection: it receives the `output` of its application |

- **A script holds information itself**, like an application: it takes information in and puts it out. It is always its own end, wherever it is stored. Its application or file location is where it lives, never an end of its connections
- **A database and a file location hold no information** themselves, but they are where you connect to their tables and files: once, with a connection string, path or login
- **"Through the parent" only applies from outside the parent.** A script that reads a file in its own file location connects to that file, never to its file location. The same holds for a file reading another file next to it

### The rules

- **Containment and connections are two separate graphs.** Being inside something says where a resource lives; connections say where information goes. Connections go between resources wherever they live: inside one file location, between applications on one server, or to a resource on another server, never through a server
- **Every slot has a direction** (`SLOTS`): `input` and `receives` only receive, `output` and `provides` only send, `contains` does both (a table or file is written to and read from)
- **A relation goes from a slot that sends to a slot that receives**, through a connection. Its ends are the ends of the connection, or a table or file inside one of them
- **The one exception is data in the type table** (internal flows): information goes without a connection from `input` to `output` inside an application or script (`internalFlows`), and from the `output` of an application to its own endpoints (`flowFromParent`)
- **Which resources can be connected** follows from the type table: the source has a slot that sends (or is the parent of one), the target a slot that receives (or is the parent of one). What a connection kind allows (a `database` connection goes to or from a database, `undecided` only between applications and external elements) is a separate table, `CONNECTION_KINDS`
- **One connection per way and direction**: three APIs between two applications are three connections, and a database that is read and written has two
- **Where information comes from** is an id on the field or object (`originId`, a resource)
- **Drawing**: an end is drawn at the closest visible resource, found by walking up the parents (a script at its application while scripts are hidden). A connection is shown per table or file it reaches. A connection of which both ends fall in the same visible resource is counted on that resource instead of drawn as an arrow

### The type table

The type table stores per type:

- `slots`: which information it holds
- `internalFlows`: which slot goes to which slot inside it without a connection
- `children`: which types it can hold, stored on the parent (which parents a type can be in is worked out from it). Per child:
  - `connectedThroughParent`: a connection from outside the parent ends at the parent (a table, a file)
  - `flowFromParent`: which slot of the parent goes to which slot of the child without a connection (an endpoint receives the `output` of its application). Without it, the child connects like any other resource (a script in an application)
- how it is drawn: a node, a row, a table card

## Step 1: One resource model (now)

- [ ] Merge resources and components into one `Resource` model: a `type`, a `parentId`, and a schema per type for its own fields (Mongoose discriminators, like `Connection`). Add the type table in the backend and the frontend, and move the backend models, routes and services and the frontend stores and services over. This removes the separate component model, `'table'` in `ResourceType`, the table store that shows tables as resources, `KINDS_CONNECTED_THROUGH_RESOURCE`, and `entityIds` on a server (its resources get it as `parentId`)
- [ ] Add the `SLOTS` table, and check every relation against it, in `createRelation` in the backend and where the frontend offers ends. It replaces what the code now knows in several places (`addToReceiver`, "Reads from offers what a file contains")
- [ ] Add the `CONNECTION_KINDS` table and check connections against it instead of per kind
- [ ] Allow connections between resources inside the same parent (file → file, script → file in one file location): from inside, a table or file is connected directly
- [ ] Draw every end at the closest visible resource by walking up the parents, for the arrows, their pieces per table or file, and their warnings. Count the connections inside one visible resource on that resource
- [ ] Let information go from an input to an output inside a script, through `internalFlows`
- [ ] Replace the `InformationSource` model by an `originId` on fields and objects
- [ ] Make endpoints resources: type `endpoint` with a kind (dashboard, map, download, report). They are where an information chain ends, and receive the `output` of their application through `flowFromParent`

Do this before the pilot, so no live data has to be migrated.

## Step 2: Other model and permission items

- [ ] Decide on the yellow warning for a connection without a table or file: writes only, or reads as well. It currently shows for both
- [ ] Work out how information flow warns about information that lost where it comes from. Keeping the information is right, but it should get a warning:
  - A script sends information to an application and the script is deleted: the information stays in the application, but nothing brings it there any more, and the application is not its source either
  - A script stops writing a field to a table (the write is removed, the script stays): the field stays in the table. Warn only when nothing else writes that field to the table
- [ ] Work out what a file location is: for now it groups files, and connections to its files go to it
- [ ] Hide or disable editing in the frontend for viewers. Until then a viewer sees edit controls, and their changes fail with "A viewer cannot make changes in this environment"
- [ ] Remove that anyone can create an organisation: `POST /org/create` is public, and the login page still has a form for it. Close the route, remove the form, and decide how a new organisation and its first admin are made instead (for example by a script)

## Step 3: Tests and error messages

- [ ] Add Vitest and a small suite for the information chain (`frontend/src/services/informationChain.service.ts`, about 950 lines). There are no automated tests yet
- [ ] Start with these chain cases: source connected and splitting, source not connected to a chain, two separate chains, source alone, source with its own unfed input, something feeding the source, information in a resource without relations
- [ ] Make every write show an error when it fails. Known examples: a failed `commitApi` (**+ New API**) shows nothing, and `deleteApi` only reports a 409
- [ ] Show relation sync failures: `keepExternalSourceRelationsInSync` only logs them and the user still sees success, so chains can quietly go out of date
- [ ] Test the speed of that sync with real data volumes: it re-syncs the whole environment on every write

## Step 4: Usability

- [ ] Style the login page: it currently has no styling at all, and it is the first thing testers see
- [ ] Make the connections on the canvas move, so you can see the direction information flows in
- [ ] Add catalogue filters such as "no source" and "broken chain", plus a progress count. At the last scan, 30 of 37 items were not in any resource *(check whether filters already exist)*
- [ ] Add a short getting-started path for an empty canvas *(unchecked)*
- [ ] Add a catalogue export: there is no export in the app yet. `frontend/src/helpers/export.ts` (`exportToCsv`) can be reused

## Step 5: Data safety

The production database and backups depend on the hosting choice in Step 6.

- [ ] Use a separate production database
- [ ] Set up backups and test a restore once. There is no undo, so a backup may be the only way back from a mistake
- [ ] Add an environment export, so an environment can be saved before a risky change *(does not exist yet, as far as checked)*

## Step 6: Build, settings and staging

These wait until there is a domain and a name. The API address, the CORS origin and the secure cookie are already configurable (see `frontend/.env.example` and `backend/.env.example`).

- [ ] Host frontend and backend on the same site, like `app.example.com` and `api.example.com`: the login cookie stays on `sameSite: 'strict'`, so login does not work across unrelated domains
- [ ] Add the hosting setup: the repo has no Docker or CI configuration yet
- [ ] Set the security headers for the frontend at the hosting platform: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `frame-ancestors 'none'` (or `X-Frame-Options: DENY`), and a `Content-Security-Policy` that allows the API address
- [ ] Set `TRUST_PROXY` on the hosting platform (usually `1`), or all users share one login limit
- [ ] Deploy to a staging environment

## Step 7: Start the pilot

- [ ] Add a simple way for testers to give feedback, and error monitoring
- [ ] Start the pilot

## During the pilot: questions to ask

- Who owns each piece of information, and which roles would you name?
- Does a field ever have a different owner from its object in practice?
- Does information get added to an object along the way, like the permit example? Would separate objects be enough, or does it need modelling?

## After the pilot

Leave these until the pilot has given feedback.

### Governance and data ownership

- A Governance section where all roles in an organisation are defined
- Those roles become the options for the owner of an information field or object
- Open question: what does it mean when an object has one owner and a field inside it has another? Maybe no issue, maybe it is

### Processes

- Define the processes of an organisation
- This probably needs other elements first, such as Governance

### Information objects that grow

An object can gain information as it travels through the system or a process. A permit might start as a request with a location, a description and the applicant. Later it might gain who gave approval, a drawing of the location, a BAG ID or a BGT ID.

### Earlier parked work

- Selecting information in Architecture with a source checkbox
- AutoComplete that stores the ID when choosing information
- Semantic zoom step 4 (capped regions)
- Generalising connection owners
- Splitting up large files, such as `ApplicationDetails.vue` (1600 lines)
