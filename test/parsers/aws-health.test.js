/* eslint-disable */

const exampleSnsMessage = {
  "version": "0",
  "id": "7bf73129-1428-4cd3-a780-95db273d1602",
  "detail-type": "AWS Health Event",
  "source": "aws.health",
  "account": "123456789012",
  "time": "2016-06-05T06:27:57Z",
  "region": "region",
  "resources": [],
  "detail": {
    "eventArn": "arn:aws:health:region::event/id",
    "service": "service",
    "eventTypeCode": "AWS_service_code",
    "eventTypeCategory": "category",
    "startTime": "Sun, 05 Jun 2016 05:01:10 GMT",
    "endTime": "Sun, 05 Jun 2016 05:30:57 GMT",
    "eventDescription": [{
      "language": "en_US",
      "latestDescription": "You have an SSL/TLS certificate from AWS Certificate Manager in your AWS account that expires on Mar 13, 2019 at 12:00:00 UTC. This certificate includes the primary domain *.example.com and a total of 1 domains.\\n\\nAWS account ID: 11111111\\nAWS Region name: us-east-1\\nCertificate identifier: arn:aws:acm:us-east-1:11111111:certificate/c8af81bb-c6e4-451c-9b44-2bed2e7ed2bb\\n\\nAWS Certificate Manager (ACM) was unable to renew the certificate automatically using DNS validation. You must take action to ensure that the renewal can be completed. If the certificate is not renewed and the current certificate expires, your website or application may become unreachable.\\n\\nTo renew this certificate, you must ensure that the proper CNAME records are present in your DNS configuration for each domain listed below. You can find the CNAME records for your domains by expanding your certificate and its domain entries in the ACM console. You can also use the DescribeCertificate command in the ACM API[1] or the describe-certificate operation in the ACM CLI[2] to find a certificate’s CNAME records. For more information, see Automatic Domain Validation Failure in the ACM troubleshooting guide[3].\\nThe following 1 domains require validation:\\n*.example.com\\n\\nIf you have questions about this process, you can contact the Support Center[4]. If you don’t have an AWS support plan, you can post a new thread in the AWS Certificate Manager discussion forum[5].\\n\\n[1] https://docs.aws.amazon.com/acm/latest/APIReference/API_DescribeCertificate.html\\n[2] https://docs.aws.amazon.com/cli/latest/reference/acm/describe-certificate.html\\n[3] https://docs.aws.amazon.com/acm/latest/userguide/troubleshooting-renewal.html#troubleshooting-renewal-domain-validation-failure\\n[4] https://console.aws.amazon.com/support\\n[5] https://forums.aws.amazon.com/forum.jspa?forumID=206"
    }]
  }
};

require("./_parser_mock")
	.named("aws-health")
	.matchesSnsMessage(exampleSnsMessage);
