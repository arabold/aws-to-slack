# AWS-to-Slack

[![npm](https://img.shields.io/npm/v/aws-to-slack.svg)](https://www.npmjs.com/package/aws-to-slack)
[![license](https://img.shields.io/github/license/arabold/aws-to-slack.svg)](https://github.com/arabold/aws-to-slack/blob/master/LICENSE)
[![dependencies](https://img.shields.io/david/arabold/aws-to-slack.svg)](https://www.npmjs.com/package/aws-to-slack)

Forward AWS CloudWatch Alarms and other notifications from Amazon SNS to Slack.

![CloudWatch Alarm Example](./docs/alert-example-cw.png)

![Elastic Beanstalk Example](./docs/alert-example-eb.png)

## What is it?

_AWS-to-Slack_ is a Lambda function written in Node.js that forwards alarms and
notifications to a dedicated [Slack](https://slack.com) channel. It self-hosted
in your own AWS environment and doesn't have any 3rd party dependencies other
than the Google Charts API for rendering CloudWatch metrics.

Supported notification formats:

- AWS Code Build
- AWS Health Dashboard 🆕
- Amazon Inspector
- Amazon SES Received Notifications 🆕
- CloudWatch Alarms (incl. Metrics)
- Elastic Beanstalk
- RDS
- Generic SNS messages
- Plain text messages

Additional formats will be added; Pull Requests are welcome!

## Try!

Ready to try it for yourself?

**If you are in the us-east-1 AWS Region:**

Installation into your own AWS environment is as
simple as pressing the button below

[![Launch CloudFormation Stack](https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png)](https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/new?stackName=aws-to-slack&templateURL=https://s3.amazonaws.com/aws-to-slack/cloudformation.yaml)

**If you are not in the us-east-1 AWS Region**

Please refer to the installation instructions below

## Installation

### Step 1 - Setup Slack

The Lambda function communicates with Slack through a Slack webhook
[webhook](https://your-slack-domain.slack.com/apps/manage). Note that you can either create an app, or a custom integration > Incoming webhook (easier, will only let you add a webhook)

1. Navigate to https://your-slack-domain.slack.com/apps/manage and click
   "Add Configuration".
2. Choose the default channel where messages will be sent and click
   "Add Incoming WebHooks Integration".
3. Copy the webhook URL from the setup instructions and use it in the next
   section.
4. Click "Save Settings" at the bottom of the Slack integration page.

![Slack Configuration](./docs/config-slack.png)

### Step 2 - Configure & Launch the CloudFormation Stack

Note that the AWS region will be the region from which you launch the CloudFormation wizard, which will also scope the resources (SNS, etc.) to that region.

**If you are launching the CloudFormation Wizard for us-east-1 resources:**

Launch the CloudFormation Stack by using our preconfigured CloudFormation
[template](https://s3.amazonaws.com/aws-to-slack/cloudformation.yaml) or
by simply pressing the following button:

[![Launch CloudFormation Stack](https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png)](https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/new?stackName=aws-to-slack&templateURL=https://s3.amazonaws.com/aws-to-slack/cloudformation.yaml)

**If you are not in the us-east-1 AWS Region:**

- Download the release.zip file and upload it so some AWS S3 Bucket (it only works with s3 URLs, plus the format must be `s3://your-bucket/path-to-file`.
- Give public access to this file in S3
- Make a copy of the cloudformation.yaml file, edit the s3 URL so that it points to your newly uploaded file s3 URL
- Go to the CloudFormation interface from you region (you can click one of the links above, but make sure to change the region to yours) then click on "upload from file" and send your modified `cloudformation.yaml` file

**Afterwards**

Click "Next" and on the following page name your new stack and paste the
webhook URL from before into the "HookUrl" field. You can also configure a
different channel to post to if wanted.

![AWS CloudFormation Configuration](./docs/config-stack.png)

Click "Next" again, complete the stack setup on the following pages and
finally launch your stack.

### Step 3 - Subscribe to Triggers

Before the Lambda function will actually do anything you need to subscribe it
to actual CloudWatch alarms and other SNS triggers. Open up the AWS Lambda,
switch to the "Triggers" tab and subscribe for all events you're interested in.

![Lambda Triggers](./docs/config-lambda-triggers.png)

### Setting Up AWS CodeBuild

CodeBuild integration was suggested by [ericcj](https://github.com/ericcj) and is based on
the Medium post [Monitor your AWS CodeBuilds via Lambda and Slack](https://hackernoon.com/monitor-your-aws-codebuilds-via-lambda-and-slack-ae2c621f68f1) by
Randy Findley.

To enable CodeBuild notifications add a new _CloudWatch Event Rule_, choose _CodeBuild_
as source and _CodeBuild Build State Change_ as type. As Target select the `aws-to-slack`
Lambda. You can leave all other settings as is. Once your rule is created all CodeBuild
build state events will be forwarded to your Slack channel.

### Publishing to S3

Need to publish your changes to the cloudformation tempate or the release.zip to your own AWS account? By default, `make publish` will copy the `cloudformation.yaml` template and `build/release.zip` to the `aws-to-slack` s3 bucket. You can specify a bucket that you own by setting `S3_PATH` when running `make publish`.

	S3_PATH=my-org-devops make publish

Or you can add a specific folder to the path. This is helpful when you want to publish this cloudformation template along side other organizational templates.

	S3_PATH=my-org-devops/cloudformation/templates/aws-to-slack make publish

## Contributing

You want to contribute? That's awesome! 🎉

Check out our [issues page](https://github.com/arabold/aws-to-slack/issues) for
some ideas how to contribute and a list of open tasks. There're plenty of
notification formats that still need to be supported.

The repository comes with a very simple `Makefile` to build the CloudFormation
stack yourself. Simply run

```bash
make deps
make package
```

To generate a new `release.zip` in the `build` folder. Upload this zip to your AWS Lambda function and you're good to go.
