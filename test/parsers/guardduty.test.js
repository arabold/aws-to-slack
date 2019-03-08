/* eslint-disable */

// The generic parser is intended to match anything that DOES NOT match another parser.
// Update these examples below if they happen to match your custom parser format.

const simpleSnsPacket = {
	Records: [{
		"EventVersion": "1.0",
		"EventSubscriptionArn": `arn:aws:sns:region:account-id:topicname:subscriptionid`,
		"EventSource": "aws:sns",
		"Sns": {
			"SignatureVersion": "1",
			"Timestamp": "1970-01-01T00:00:00.000Z",
			"Signature": "EXAMPLE",
			"SigningCertUrl": "EXAMPLE",
			"MessageId": "95df01b4-ee98-5cb9-9903-4c221d41eb5e",
			"Message": "{\"version\":\"0\",\"id\":\"4565c69d-00e7-e740-2b17-234d\",\"detail-type\":\"GuardDuty Finding\",\"source\":\"aws.guardduty\",\"account\":\"12345678\",\"time\":\"2019-02-21T06:07:17Z\",\"region\":\"ap-southeast-2\",\"resources\":[],\"detail\":{\"schemaVersion\":\"2.0\",\"accountId\":\"845345345\",\"region\":\"ap-southeast-2\",\"partition\":\"aws\",\"id\":\"345rf3ff\",\"arn\":\"arn:aws:guardduty:ap-southeast-2:123456778:detector/f0b004e2d3c8a11f786fa8faec50b19a/finding/18b48550bee9b37e3953983474f0f59d\",\"type\":\"Recon:EC2/PortProbeUnprotectedPort\",\"resource\":{\"resourceType\":\"Instance\",\"instanceDetails\":{\"instanceId\":\"i-blart\",\"instanceType\":\"t2.micro\",\"launchTime\":\"2019-02-20T11:00:56Z\",\"platform\":null,\"productCodes\":[],\"iamInstanceProfile\":null,\"networkInterfaces\":[{\"ipv6Addresses\":[],\"networkInterfaceId\":\"eni-0af858c8afc15a077\",\"privateDnsName\":\"ip-172-31-8-176.ap-southeast-2.compute.internal\",\"privateIpAddress\":\"172.31.8.176\",\"privateIpAddresses\":[{\"privateDnsName\":\"ip-172-31-8-176.ap-southeast-2.compute.internal\",\"privateIpAddress\":\"172.31.8.176\"}],\"subnetId\":\"subnet-453454534\",\"vpcId\":\"vpc-453454534\",\"securityGroups\":[{\"groupName\":\"default\",\"groupId\":\"sg-453454534\"}],\"publicDnsName\":\"ec2-52-64-107-188.ap-southeast-2.compute.amazonaws.com\",\"publicIp\":\"52.64.107.188\"}],\"tags\":[{\"key\":\"OwnerContact\",\"value\":\"test@example.com\"}],\"instanceState\":\"running\",\"availabilityZone\":\"ap-southeast-2b\",\"imageId\":\"ami-02fd0b06f06d93dfc\",\"imageDescription\":\"Amazon Linux AMI 2018.03.0.20181129 x86_64 HVM gp2\"}},\"service\":{\"serviceName\":\"guardduty\",\"detectorId\":\"f0b004e2d3c8a11f786fa8faec50b19a\",\"action\":{\"actionType\":\"PORT_PROBE\",\"portProbeAction\":{\"portProbeDetails\":[{\"localPortDetails\":{\"port\":22,\"portName\":\"SSH\"},\"remoteIpDetails\":{\"ipAddressV4\":\"122.2.223.242\",\"organization\":{\"asn\":\"9299\",\"asnOrg\":\"Philippine Long Distance Telephone Company\",\"isp\":\"Philippine Long Distance Telephone\",\"org\":\"Philippine Long Distance Telephone\"},\"country\":{\"countryName\":\"Philippines\"},\"city\":{\"cityName\":\"Dolores\"},\"geoLocation\":{\"lat\":14.5703,\"lon\":121.1472}}}],\"blocked\":false}},\"resourceRole\":\"TARGET\",\"additionalInfo\":{\"threatName\":\"Scanner\",\"threatListName\":\"ProofPoint\"},\"eventFirstSeen\":\"2019-02-20T11:13:58Z\",\"eventLastSeen\":\"2019-02-21T05:51:10Z\",\"archived\":false,\"count\":49},\"severity\":2,\"createdAt\":\"2019-02-20T11:19:09.523Z\",\"updatedAt\":\"2019-02-21T06:00:14.003Z\",\"title\":\"Unprotected port on EC2 instance i-blart is being probed.\",\"description\":\"EC2 instance has an unprotected port which is being probed by a known malicious host.\"}}",
			"MessageAttributes": {
				"Test": {
					"Type": "String",
					"Value": "TestString"
				},
				"TestBinary": {
					"Type": "Binary",
					"Value": "TestBinary"
				}
			},
			"Type": "Notification",
			"UnsubscribeUrl": "EXAMPLE",
			"TopicArn": `arn:aws:sns:region:account-id:topicname`,
			"Subject": "TestInvoke"
		}
	}]
};


const mock = require("./_parser_mock").named("guardduty");
mock.matchesEvent(simpleSnsPacket);

test(`Parser[guardduty] will match event and provide detail`, async () => {

	const result = await mock.makeNew().parse(simpleSnsPacket);

	expect(result.attachments[0]).toMatchObject({
		"author_name": "Amazon GuardDuty",
        "color": "warning",
		"fallback":"Unprotected port on EC2 instance i-blart is being probed. EC2 instance has an unprotected port which is being probed by a known malicious host.",
		"title": "Unprotected port on EC2 instance i-blart is being probed.",
	});
});
