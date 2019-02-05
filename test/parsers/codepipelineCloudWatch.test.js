/* eslint-disable */

const exampleEvent = {
	"version": "0",
	"id": "f3c0d851-b344-4c84-0a68-d8b9fb67b430",
	"detail-type": "CodePipeline Pipeline Execution State Change",
	"source": "aws.codepipeline",
	"account": "111111111111",
	"time": "2019-01-22T16:38:24Z",
	"region": "us-east-1",
	"resources": [
		"arn:aws:codepipeline:us-east-1:111111111111:my-pipeline"
	],
	"detail": {
		"pipeline": "my-pipeline",
		"execution-id": "b938328a-79f5-484b-bff3-a412c69ef1eb",
		"state": "STARTED",
		"version": 2
	}
};

require("./_parser_mock")
	.named("codepipelineCloudWatch")
	.matchesEvent(exampleEvent);
