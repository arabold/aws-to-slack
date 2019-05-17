/* eslint-disable */

const example = {
	"version": "0",
	"id": "01234567-0123-0123-0123-012345678901",
	"detail-type": "CodeCommit Repository State Change",
	"source": "aws.codecommit",
	"account": "123456789012",
	"time": "2017-06-12T10:23:43Z",
	"region": "us-east-1",
	"resources": [
		"arn:aws:codecommit:us-east-1:123456789012:myRepo"
	],
	"detail": {
		"event": "referenceUpdated",
		"repositoryName": "myRepo",
		"repositoryId": "12345678-1234-5678-abcd-12345678abcd",
		"referenceType": "branch",
		"referenceName": "myBranch",
		"referenceFullName": "refs/heads/myBranch",
		"commitId": "26a8f2EXAMPLE",
		"oldCommitId": "3e5983EXAMPLE"
	}
};

// Configure aws-sdk to fail-fast
const AWS = require('aws-sdk');
AWS.config.credentials = new AWS.Credentials({ accessKeyId: "foo", secretAccessKey: "bar" });
// Mock console.error to hide expected errors
console.error = jest.fn();

require("./_parser_mock")
	.named("codecommit/repository")
	.matchesSnsMessage(example);

