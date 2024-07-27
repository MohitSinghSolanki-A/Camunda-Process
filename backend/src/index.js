require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { Camunda8, Auth } = require("@camunda8/sdk");

const app = express();
app.use(bodyParser.json());

const camunda = new Camunda8();
const zeebe = camunda.getZeebeGrpcApiClient();
const tasklist = camunda.getTasklistApiClient();
const operate = camunda.getOperateApiClient();
const modeler = camunda.getModelerApiClient();

let pollingInterval;

// let accessToken; // To store the retrieved access token

// Function to retrieve and store the access token
// async function getToken() {
//     try {
//         const tokenProvider = new Auth.OAuthProvider();
//         accessToken = await tokenProvider.getToken("ZEEBE");
//         console.log('Access Token:', accessToken);
//     } catch (error) {
//         console.error('Error getting token:', error);
//         throw error; // Propagate the error if token retrieval fails
//     }
// }

// Deploy BPMN process and start instance
app.post("/api/start-process", async (req, res) => {
  try {
    const deploy = await zeebe.deployResource({
      processFilename: path.join(process.cwd(), process.env.BPMN_FILE_PATH),
    });
    const instance = await zeebe.createProcessInstance({
      bpmnProcessId: deploy.deployments[0].process.bpmnProcessId,
      variables: req.body.variables,
    });

    console.log(instance);
    // Start task poller
    startHumanTaskPoller(instance.processInstanceKey);

    res.status(200).json({ processInstanceKey: instance.processInstanceKey });
  } catch (error) {
    console.error("Error starting process:", error);
    res.status(500).send("Error starting process");
  }
});

// Fetch task list
app.get("/api/tasks", async (req, res) => {
  try {
    const tasks = await tasklist.searchTasks({ state: "CREATED" });
    const ids = tasks.map((ele, i) => ele.id);
    // console.log(tasks[0].id)
    return res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).send("Error fetching tasks");
  }
});

// Completing task
app.post("/api/complete-task", async (req, res) => {
  const { taskID, variables } = req.body;
  try {
    // console.log("task ids : ", taskID);
    // console.log("variable : ", variables)

    const data = await tasklist.completeTask(taskID, variables);
    res.status(200).send({ message: "Task completed", body: req.body, data });
  } catch (error) {
    console.error("Error completing task:", error);
    res.status(500).send("Error completing task");
  }
});

//getting a particular task

app.get("/api/task/:taskId", async (req, res) => {
  const { taskId } = req.params;
  try {
    const taskDetails = await tasklist.getTask(taskId);
    res.status(200).json(taskDetails);
  } catch (error) {
    console.error("Error fetching task details:", error);
    res.status(500).send("Error fetching task details");
  }
});

// Start human task poller
async function startHumanTaskPoller(processInstanceKey) {
  pollingInterval = setInterval(async () => {
    try {
      const res = await tasklist.searchTasks({ state: "CREATED" });
      if (res.length > 0) {
        for (const task of res) {
          const t = await tasklist.assignTask({
            taskId: task.id,
            assignee: "mohit.solanki@allen.in",
            allowOverrideAssignment: true,
          });
          await waitForTaskCompletion(t.id);
        }
      }
      const processInstance = await operate.getProcessInstance(
        processInstanceKey
      );
      if (processInstance.state === "COMPLETED") {
        console.log(
          `[Tasklist] Process instance ${processInstanceKey} is completed`
        );
        clearInterval(pollingInterval);
      }
    } catch (error) {
      console.error("Error polling human tasks:", error);
    }
  }, 3000);
}

async function waitForTaskCompletion(taskId) {
  while (true) {
    const taskDetails = await tasklist.getTask(taskId);
    if (taskDetails.state === "COMPLETED") break;
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

const PORT = process.env.PORT || 5020;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
});
