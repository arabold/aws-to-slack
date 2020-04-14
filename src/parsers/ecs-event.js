//
// AWS ECS Event
//
exports.matches = event =>
	event.getSource() === "ecs";

exports.parse = event => {
	const time = new Date(event.get("time"));
	const detailType = event.get("detail-type");
	const status = event.get("detail.lastStatus");
	const desiredStatus = event.get("detail.desiredStatus");
	const region = event.parseArn(event.get("detail.clusterArn")).region;
	const cluster = event.parseArn(event.get("detail.clusterArn")).resource.slice(8);
	const clusterUrl = `https://console.aws.amazon.com/ecs/home?region=${region}#/clusters/${cluster}/services`;
	const fields = [];

	var title = `${cluster} - ${detailType} - ${status}`;
	var color = event.COLORS.neutral;

	if (detailType === "ECS Task State Change") {

		// {
		// 	"version": "0",
		// 	"id": "0efbccea-222d-61fc-c9f3-############",
		// 	"detail-type": "ECS Task State Change",
		// 	"source": "aws.ecs",
		// 	"account": "###########",
		// 	"time": "2020-04-14T13:16:34Z",
		// 	"region": "eu-west-1",
		// 	"resources": [
		// 		"arn:aws:ecs:eu-west-1:############:task/proxy-ecs-cluster-dev/############"
		// 	],
		// 	"detail": {
		// 		"attachments": [
		// 			{
		// 				"id": "c11519c0-1c1d-49b1-b746-############",
		// 				"type": "eni",
		// 				"status": "PRECREATED",
		// 				"details": [
		// 					{
		// 						"name": "subnetId",
		// 						"value": "subnet-:############:"
		// 					}
		// 				]
		// 			}
		// 		],
		// 		"availabilityZone": "eu-west-1a",
		// 		"clusterArn": "arn:aws:ecs:eu-west-1:############:cluster/proxy-ecs-cluster-dev",
		// 		"containers": [
		// 			{
		// 				"containerArn": "arn:aws:ecs:eu-west-1:############:container/8214fb33-1792-47e5-a673-############",
		// 				"lastStatus": "PENDING",
		// 				"name": "proxy-blue-master-container-dev",
		// 				"image": "############.dkr.ecr.eu-west-1.amazonaws.com/proxy-dev:master",
		// 				"taskArn": "arn:aws:ecs:eu-west-1:############:task/proxy-ecs-cluster-dev/############",
		// 				"networkInterfaces": [],
		// 				"cpu": "0"
		// 			}
		// 		],
		// 		"createdAt": "2020-04-14T13:16:34.96Z",
		// 		"launchType": "FARGATE",
		// 		"cpu": "256",
		// 		"memory": "512",
		// 		"desiredStatus": "RUNNING",
		// 		"group": "service:ProxyApplicationBlueMaster-EcsServiceDev-############",
		// 		"lastStatus": "PROVISIONING",
		// 		"overrides": {
		// 			"containerOverrides": [
		// 				{
		// 					"name": "proxy-blue-master-container-dev"
		// 				}
		// 			]
		// 		},
		// 		"startedBy": "ecs-svc/############",
		// 		"updatedAt": "2020-04-14T13:16:34.96Z",
		// 		"taskArn": "arn:aws:ecs:eu-west-1:############:task/proxy-ecs-cluster-dev/############",
		// 		"taskDefinitionArn": "arn:aws:ecs:eu-west-1:############:task-definition/proxy-blue-master-container-dev:1",
		// 		"version": 1,
		// 		"platformVersion": "1.3.0"
		// 	}
		// }

		const service = event.get("detail.group").slice(8);
		const serviceUrl = `https://console.aws.amazon.com/ecs/home?region=${region}#/clusters/${cluster}/services/${service}/details`;

		const getTask = event.parseArn(event.get("detail.taskArn")).resource;
		const task = getTask.slice(5).replace(cluster+'/', '');
		const taskUrl = `https://console.aws.amazon.com/ecs/home?region=${region}#/clusters/${cluster}/tasks/${task}/details`;
		const logsUrl = `https://console.aws.amazon.com/ecs/home?region=${region}#/clusters/${cluster}/services/${service}/logs`;

		var stoppedReason = "Unknown";
		title = null;

		// default is warning
		color = event.COLORS.warning;

		if (status === "RUNNING" && desiredStatus === "RUNNING") {
			color = event.COLORS.ok;
		}
		else if (desiredStatus === "STOPPED") {
			stoppedReason = event.get("detail.stoppedReason");
			color = event.COLORS.critical;
		}

		fields.push({
			title: "Task",
			value: `<${taskUrl}|${task}>`,
			short: false
		});

		fields.push({
			title: "Status",
			value: `${status}`,
			short: true
		});

		fields.push({
			title: "Desired Status",
			value: `${desiredStatus}`,
			short: true
		});

		fields.push({
			title: "Reason",
			value: `${stoppedReason}`,
			short: true
		});

		fields.push({
			title: "Service Logs",
			value: `<${logsUrl}|View Logs>`,
			short: true
		});

		fields.push({
			title: "Service",
			value: `<${serviceUrl}|${service}>`,
			short: false
		});

		fields.push({
			title: "Cluster",
			value: `<${clusterUrl}|${cluster}>`,
			short: false
		});
	
	}
	else if (detailType === "ECS Service Action") {

		// {
		// 	"version": "0",
		// 	"id": "fce16a07-6467-199e-d07e-############",
		// 	"detail-type": "ECS Service Action",
		// 	"source": "aws.ecs",
		// 	"account": "############",
		// 	"time": "2020-04-14T13:17:15Z",
		// 	"region": "eu-west-1",
		// 	"resources": [
		// 		"arn:aws:ecs:eu-west-1:##############:service/proxy-ecs-cluster-dev/ProxyApplicationBlueMaster-EcsServiceDev-##############"
		// 	],
		// 	"detail": {
		// 		"eventType": "INFO",
		// 		"eventName": "SERVICE_STEADY_STATE",
		// 		"clusterArn": "arn:aws:ecs:eu-west-1:##############:cluster/proxy-ecs-cluster-dev",  
		// 		"createdAt": "2020-04-14T13:17:15.733Z"
		// 	}
		// }

		const eventType = event.get("detail.eventType");
		const eventName = event.get("detail.eventName");
		const getService = event.parseArn(event.get("resources")).resource;
		const service = getService.slice(8).replace(cluster+'/', '');
		const serviceUrl = `https://console.aws.amazon.com/ecs/home?region=${region}#/clusters/${cluster}/services/${service}/details`;
		const logsUrl = `https://console.aws.amazon.com/ecs/home?region=${region}#/clusters/${cluster}/services/${service}/logs`;

		title = null;

		if (eventType === "INFO") {
			color = event.COLORS.ok;
		}
		else if (status === "WARN") {
			color = event.COLORS.warning;
		}
		else if (status === "ERROR") {
			color = event.COLORS.critical;
		}

		fields.push({
			title: "Service",
			value: `<${serviceUrl}|${service}>`,
			short: false
		});

		fields.push({
			title: "Status",
			value: `${eventName}`,
			short: true
		});

		fields.push({
			title: "Service Logs",
			value: `<${logsUrl}|View Logs>`,
			short: true
		});

		fields.push({
			title: "Cluster",
			value: `<${clusterUrl}|${cluster}>`,
			short: false
		});	

	}

	return event.attachmentWithDefaults({
		author_name: `Amazon ECS - ${detailType}`,
		fallback: `${title}`,
		color: color,
		title: title,
		fields: fields,
		mrkdwn_in: ["title", "text"]
	});
};