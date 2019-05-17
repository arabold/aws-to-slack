/* eslint-disable */

// AWS example event: codepipeline.StateChange.ManualApproval.json
const exampleManualApprovalStateChange = {
	"version": "0",
	"id": "abcdefgh-ee18-1111-3fc1-951f022567a1",
	"detail-type": "CodePipeline Action Execution State Change",
	"source": "aws.codepipeline",
	"account": "123456789012",
	"time": "2018-11-06T21:36:10Z",
	"region": "us-east-1",
	"resources": ["arn:aws:codepipeline:us-east-1:123456789012:mypipeline"],
	"detail": {
		"pipeline": "mypipeline",
		"execution-id": "abcdefgh-ce35-1111-a123-c501546c9cdb",
		"stage": "Deploy",
		"action": "Deploy",
		"state": "STARTED",
		"region": "us-east-1",
		"type": {"owner": "AWS", "provider": "Manual", "category": "Deploy", "version": "1"},
		"version": 4.0
	}
};

const pipeExample = {
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

const actionExample = {
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

const stageExample = {
	"version": "0",
	"id": "CWE-event-id",
	"detail-type": "CodePipeline Stage Execution State Change",
	"source": "aws.codepipeline",
	"account": "123456789012",
	"time": "2017-04-22T03:31:47Z",
	"region": "us-east-1",
	"resources": [
		"arn:aws:codepipeline:us-east-1:123456789012:pipeline:myPipeline"
	],
	"detail": {
		"pipeline": "myPipeline",
		"version": "1",
		"execution-id": "01234567-0123-0123-0123-012345678901",
		"stage": "Prod",
		"state": "STARTED"
	}
};

require("./_parser_mock")
	.named("codepipeline")
	.matchesEvent(pipeExample)
	.matchesEvent(actionExample)
	.matchesEvent(stageExample)
	.matchesSnsMessage(exampleManualApprovalStateChange);


// AWS example event: codepipeline-approval.ApprovalRequest.json
const exampleApprovalRequest = {
	"region": "us-east-1",
	"consoleLink": "https://console.aws.amazon.com/codepipeline/home?region=us-east-1#/view/mypipeline.name",
	"approval": {
		"pipelineName": "mypipeline.name",
		"stageName": "Deploy",
		"actionName": "Deploy_Approval",
		"token": "abcdefgh-b2fb-1234-a00a-31a03b998faa",
		"expires": "2018-11-13T21:36Z",
		"externalEntityLink": "https://my.reviewwebsite.com",
		"approvalReviewLink": "https://console.aws.amazon.com/codepipeline/home?region=us-east-1#/view/mypipeline.name/Deploy/Deploy_Approval/approve/abcdefgh-b2fb-1234-a00a-31a03b998faa",
		"customData": "TESTING :: Manual approval for a deployment to mypipeline.name"
	}
};

require("./_parser_mock")
	.named("codepipeline-approval")
	.matchesSnsMessage(exampleApprovalRequest);
