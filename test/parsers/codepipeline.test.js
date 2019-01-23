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

require("./_parser_mock")
	.named("codepipelineSns")
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
