AWS_CLI?=/usr/local/bin/aws
TEMP_PATH=.temp
RELEASE_ZIP=build/release.zip

.PHONY: deps
deps:
	npm install

.PHONY: package
package:
	# Prepare
	-@rm -r "$(TEMP_PATH)" 2>/dev/null || true
	-@rm "$(RELEASE_ZIP)" 2>/dev/null || true
	@mkdir -p "$(TEMP_PATH)"

	# Copy sources to temporary folder
	@cp -R src package-lock.json package.json "$(TEMP_PATH)/"

	# Install dependencies
	@cd "$(TEMP_PATH)" && npm install --production

	# Package artifact
	@cd "$(TEMP_PATH)" && zip -r "../$(RELEASE_ZIP)" .

	# Cleanup
	@rm -r "$(TEMP_PATH)"

.PHONY: publish
publish:
	@"$(AWS_CLI)" s3 cp "./cloudformation.yaml" "s3://aws-to-slack-us-east-2" --acl public-read
	@"$(AWS_CLI)" s3 cp "./cloudformation.yaml" "s3://aws-to-slack-us-east-1" --acl public-read
	@"$(AWS_CLI)" s3 cp "./cloudformation.yaml" "s3://aws-to-slack-us-west-1" --acl public-read
	@"$(AWS_CLI)" s3 cp "./cloudformation.yaml" "s3://aws-to-slack-us-west-2" --acl public-read
	@"$(AWS_CLI)" s3 cp "./cloudformation.yaml" "s3://aws-to-slack-ap-northeast-2" --acl public-read
	@"$(AWS_CLI)" s3 cp "./cloudformation.yaml" "s3://aws-to-slack-ap-south-1" --acl public-read
	@"$(AWS_CLI)" s3 cp "./cloudformation.yaml" "s3://aws-to-slack-ap-southeast-1" --acl public-read
	@"$(AWS_CLI)" s3 cp "./cloudformation.yaml" "s3://aws-to-slack-ap-southeast-2" --acl public-read
	@"$(AWS_CLI)" s3 cp "./cloudformation.yaml" "s3://aws-to-slack-ap-northeast-1" --acl public-read
	@"$(AWS_CLI)" s3 cp "./cloudformation.yaml" "s3://aws-to-slack-ca-central-1" --acl public-read
	@"$(AWS_CLI)" s3 cp "./cloudformation.yaml" "s3://aws-to-slack-eu-central-1" --acl public-read
	@"$(AWS_CLI)" s3 cp "./cloudformation.yaml" "s3://aws-to-slack-eu-west-1" --acl public-read
	@"$(AWS_CLI)" s3 cp "./cloudformation.yaml" "s3://aws-to-slack-eu-west-2" --acl public-read
	@"$(AWS_CLI)" s3 cp "./cloudformation.yaml" "s3://aws-to-slack-eu-west-3" --acl public-read
	@"$(AWS_CLI)" s3 cp "./cloudformation.yaml" "s3://aws-to-slack-sa-east-1" --acl public-read
	#@"$(AWS_CLI)" s3 cp "./cloudformation.yaml" "s3://aws-to-slack-cn-north-1" --acl public-read
	#@"$(AWS_CLI)" s3 cp "./cloudformation.yaml" "s3://aws-to-slack-cn-northwest-1" --acl public-read

	@"$(AWS_CLI)" s3 cp "$(RELEASE_ZIP)" "s3://aws-to-slack-us-east-2" --acl public-read
	@"$(AWS_CLI)" s3 cp "$(RELEASE_ZIP)" "s3://aws-to-slack-us-east-1" --acl public-read
	@"$(AWS_CLI)" s3 cp "$(RELEASE_ZIP)" "s3://aws-to-slack-us-west-1" --acl public-read
	@"$(AWS_CLI)" s3 cp "$(RELEASE_ZIP)" "s3://aws-to-slack-us-west-2" --acl public-read
	@"$(AWS_CLI)" s3 cp "$(RELEASE_ZIP)" "s3://aws-to-slack-ap-northeast-2" --acl public-read
	@"$(AWS_CLI)" s3 cp "$(RELEASE_ZIP)" "s3://aws-to-slack-ap-south-1" --acl public-read
	@"$(AWS_CLI)" s3 cp "$(RELEASE_ZIP)" "s3://aws-to-slack-ap-southeast-1" --acl public-read
	@"$(AWS_CLI)" s3 cp "$(RELEASE_ZIP)" "s3://aws-to-slack-ap-southeast-2" --acl public-read
	@"$(AWS_CLI)" s3 cp "$(RELEASE_ZIP)" "s3://aws-to-slack-ap-northeast-1" --acl public-read
	@"$(AWS_CLI)" s3 cp "$(RELEASE_ZIP)" "s3://aws-to-slack-ca-central-1" --acl public-read
	@"$(AWS_CLI)" s3 cp "$(RELEASE_ZIP)" "s3://aws-to-slack-eu-central-1" --acl public-read
	@"$(AWS_CLI)" s3 cp "$(RELEASE_ZIP)" "s3://aws-to-slack-eu-west-1" --acl public-read
	@"$(AWS_CLI)" s3 cp "$(RELEASE_ZIP)" "s3://aws-to-slack-eu-west-2" --acl public-read
	@"$(AWS_CLI)" s3 cp "$(RELEASE_ZIP)" "s3://aws-to-slack-eu-west-3" --acl public-read
	@"$(AWS_CLI)" s3 cp "$(RELEASE_ZIP)" "s3://aws-to-slack-sa-east-1" --acl public-read
	#@"$(AWS_CLI)" s3 cp "$(RELEASE_ZIP)" "s3://aws-to-slack-cn-north-1" --acl public-read
	#@"$(AWS_CLI)" s3 cp "$(RELEASE_ZIP)" "s3://aws-to-slack-cn-northwest-1" --acl public-read
