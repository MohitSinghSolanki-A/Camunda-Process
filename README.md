Environment and Dependencies: Loads environment variables and requires necessary modules.

Camunda Client Initialization: Initializes Camunda 8 clients for Zeebe, Tasklist, and Operate APIs.

Express Server Setup: Configures the Express server to parse JSON requests.

API Endpoints: /api/start-process: Deploys a BPMN process and starts an instance.

/api/tasks: Fetches a list of created tasks.

/api/complete-task: Completes a specified task.

/api/task/:taskId: Fetches details of a specific task by ID.

Human Task Poller: Periodically checks for new human tasks and assigns them, stopping when the process instance is completed.
