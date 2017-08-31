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
* AWS Health Dashboard 🆕
* CloudWatch Alarms (incl. Metrics)
* Elastic Beanstalk
* RDS
* Generic SNS messages
* Plain text messages

Additional formats will be added; Pull Requests are welcome!

## Try!
Ready to try it for yourself? Installation into your own AWS environment is as
simple as pressing the button below:

[![Launch CloudFormation Stack](https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png)](https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/new?stackName=aws-to-slack&templateURL=https://s3.amazonaws.com/aws-to-slack/cloudformation.yaml)


## Installation

### Step 1 - Setup Slack
The Lambda function communicates with Slack through a
[webhook](https://stashimi.slack.com/apps/A0F7XDUAZ-incoming-webhooks):

1. Navigate to https://slack.com/apps/A0F7XDUAZ-incoming-webhooks and click
   "Add Configuration".
2. Choose the default channel where messages will be sent and click
   "Add Incoming WebHooks Integration".
3. Copy the webhook URL from the setup instructions and use it in the next
   section.
4. Click "Save Settings" at the bottom of the Slack integration page.

![Slack Configuration](./docs/config-slack.png)

### Step 2 - Configure & Launch the CloudFormation Stack
Launch the CloudFormation Stack by using our preconfigured CloudFormation
[template](https://s3.amazonaws.com/aws-to-slack/cloudformation.yaml) or
by simply pressing the following button:

[![Launch CloudFormation Stack](https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png)](https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/new?stackName=aws-to-slack&templateURL=https://s3.amazonaws.com/aws-to-slack/cloudformation.yaml)

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

To generate a new `release.zip` in the `build` folder. Upload this zip to your
AWS Lambda function and you're good to go.
