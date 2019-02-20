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

const exampleEvent2 = {
	"version": "0",
	"id": "d2ec51b0-119e-bd9f-9602-81679b3a0dcf",
	"detail-type": "CodePipeline Action Execution State Change",
	"source": "aws.codepipeline",
	"account": "012345678901",
	"time": "2019-02-20T16:34:46Z",
	"region": "us-east-1",
	"resources": [
		"arn:aws:codepipeline:us-east-1:012345678901:foo-pipeline"
	],
	"detail": {
		"pipeline": "foo-pipeline",
		"execution-id": "4b02612a-1b13-4d4f-bc78-1fb45dc6376e",
		"stage": "FooStage",
		"action": "PackageExport",
		"state": "STARTED",
		"region": "us-east-1",
		"type": {
			"owner": "AWS",
			"provider": "CodeBuild",
			"category": "Build",
			"version": "1"
		},
		"version": 3
	}
};

require("./_parser_mock")
	.named("codepipelineCloudWatch")
	.matchesEvent(exampleEvent)
	.matchesEvent(exampleEvent2);
