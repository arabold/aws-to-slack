# AWS-to-Slack
Forward AWS CloudWatch Alarms and other notifications from Amazon SNS to Slack.

![CloudWatch Alarm Example](./docs/alert-example-cw.png)

![Elastic Beanstalk Example](./docs/alert-example-eb.png)

## What is it?
_AWS-to-Slack_ is a Lambda function written in Node.js that forwards alarms and
notifications to a dedicated [Slack](https://slack.com) channel. It self-hosted
in your own AWS environment and doesn't have any 3rd party dependencies other
than the Google Charts API for rendering CloudWatch metrics.

Supported notification formats:
* CloudWatch Alarms (incl. Metrics)
* Elastic Beanstalk
* Generic SNS messages
* Plain text messages

Additional formats will be added; Pull Requests are welcome!

## Try!
Ready to try it for yourself? Installation into your own AWS environment is as
simple as pressing the button below:

[![Launch CloudFormation Stack](https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png)](https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/new?stackName=aws-to-slack&templateURL=https://s3.amazonaws.com/aws-to-slack/cloudformation.yaml)

## Configuration

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

## Subscribe to Alarms

Before the Lambda function will actually do anything you need to subscribe it
to actual CloudWatch alarms. Open up the AWS Lambda, switch to the "Triggers"
tab and add triggers for all events you're interested in.

![Lambda Triggers](./docs/config-lambda-triggers.png)
