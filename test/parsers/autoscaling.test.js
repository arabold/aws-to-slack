/* eslint-disable */

const exampleSnsMessage = {
	"AccountId": "849571656326",
	"RequestId": "bad2bfb5-0a61-11e9-aed0-a14d1975b70c",
	"AutoScalingGroupARN": "arn:aws:autoscaling:us-east-1:849571656326:autoScalingGroup:d4a75f82-0970-4761-80f8-8ebc4999761d:autoScalingGroupName/revo-ecs-cluster-AutoScalingGroup-6TD45WIULWSY",
	"AutoScalingGroupName": "revo-ecs-cluster-AutoScalingGroup-6TD45WIULWSY",
	"Service": "AWS Auto Scaling",
	"Event": "autoscaling:TEST_NOTIFICATION",
	"Time": "2018-12-28T05:30:47.704Z"
};

require("./_parser_mock")
	.named("autoscaling")
	.matchesSnsMessage(exampleSnsMessage);
