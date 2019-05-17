/* eslint-disable */

const subject = "AWS CloudFormation Notification";

// LogicalResourceId === StackName
const matchingSnsMessage = [
	"StackId='arn:aws:cloudformation:REGION:ACCOUNT_ID:stack/STACK_NAME/1bff3bd0-8f10-11e7-8d95-500c28604ce6'",
	"Timestamp='2019-01-19T14:40:38.306Z'",
	"EventId='300f76f0-1bf8-11e9-bf02-123ad236a92a'",
	"LogicalResourceId='STACK_NAME'",
	"Namespace='ACCOUNT_ID'",
	"PhysicalResourceId='arn:aws:cloudformation:REGION:ACCOUNT_ID:stack/STACK_NAME/1bff3bd0-8f10-11e7-8d95-500c28604ce6'",
	"PrincipalId='PRINCIPAL_ID'",
	"ResourceProperties='null'",
	"ResourceStatus='UPDATE_IN_PROGRESS'",
	"ResourceStatusReason='User Initiated'",
	"ResourceType='AWS::CloudFormation::Stack'",
	"StackName='STACK_NAME'",
	"ClientRequestToken='Console-ExecuteChangeSet-c40d42f5-3099-c0ab-c1bd-c5058f140ac0'",
].join("\n");

require("./_parser_mock")
	.named("cloudformation")
	.matchesSnsMessage(matchingSnsMessage, subject);


// LogicalResourceId !== StackName
const ignoredSnsMessage = [
	"StackId='arn:aws:cloudformation:REGION:ACCOUNT_ID:stack/STACK_NAME/1bff3bd0-8f10-11e7-8d95-500c28604ce6'",
	"Timestamp='2019-01-19T14:40:38.306Z'",
	"EventId='300f76f0-1bf8-11e9-bf02-123ad236a92a'",
	"LogicalResourceId='LOGICAL_RESOURCE_ID'",
	"Namespace='ACCOUNT_ID'",
	"PhysicalResourceId='arn:aws:cloudformation:REGION:ACCOUNT_ID:stack/STACK_NAME/1bff3bd0-8f10-11e7-8d95-500c28604ce6'",
	"PrincipalId='PRINCIPAL_ID'",
	"ResourceProperties='null'",
	"ResourceStatus='UPDATE_IN_PROGRESS'",
	"ResourceStatusReason='User Initiated'",
	"ResourceType='AWS::CloudFormation::Stack'",
	"StackName='STACK_NAME'",
	"ClientRequestToken='Console-ExecuteChangeSet-c40d42f5-3099-c0ab-c1bd-c5058f140ac0'",
].join("\n");

require("./_parser_mock")
	.named("cloudformation")
	.willStopHandlerWithSnsEvent(ignoredSnsMessage, subject);
