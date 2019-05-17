/* eslint-disable */

const example = {
	"version": "0",
	"id": "0025bc20-ad26-59f8-f11e-c36022019c04",
	"detail-type": "CodeCommit Pull Request State Change",
	"source": "aws.codecommit",
	"account": "123456789012",
	"time": "2019-05-17T06:58:15Z",
	"region": "ap-southeast-1",
	"resources": [
		"arn:aws:codecommit:us-east-1:123456789012:myRepo"
	],
	"detail": {
		"author": "AIDAI2Y6GR62QVEXAMPLE",
		"callerUserArn": "arn:aws:iam::123456789101:user/TheUserHandle",
		"creationDate": "Fri May 17 06:58:12 UTC 2019",
		"description": "bla bla bla",
		"destinationCommit": "0100e16b1ae91234cd3638a52220f3f96e63dacb8",
		"destinationReference": "refs/heads/master",
		"event": "pullRequestCreated",
		"isMerged": "False",
		"lastModifiedDate": "Fri May 17 06:58:12 UTC 2019",
		"notificationBody": "long text describing the operation",
		"pullRequestId": "17",
		"pullRequestStatus": "Open",
		"repositoryNames": ["the-repo-name"],
		"sourceCommit": "8c10183f7a01cceabf071eec60e7cddbfff4cb26",
		"sourceReference": "refs/heads/the-origin-branch",
		"title": "random title"
	}
};

// Configure aws-sdk to fail-fast
const AWS = require('aws-sdk');
AWS.config.credentials = new AWS.Credentials({accessKeyId: "foo", secretAccessKey: "bar"});
// Mock console.error to hide expected errors
console.error = jest.fn();

require("./_parser_mock")
	.named("codecommit/pullrequest")
	.matchesSnsMessage(example);
