AWS_CLI	   ?= /usr/local/bin/aws
TEMP_PATH   = .temp
RELEASE_ZIP = release.zip

# Load from .env file
ifdef TARGET
  include $(TARGET)
  export
endif

# Dependency definitions
ifdef AWS_REGION
  regionArg= --region $(AWS_REGION)
endif
ifndef LAMBDA_NAME
  ifndef STACK_ID
  usesLambdaName := create-stack load-lambda-name
  else
  usesLambdaName := load-lambda-name
  endif
endif
ifeq (,$(wildcard $(RELEASE_ZIP)))
  usesReleaseZip := package
endif


# Create release.zip file
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
	@cd "$(TEMP_PATH)" && zip -rq "../$(RELEASE_ZIP)" .

	# Cleanup
	@rm -r "$(TEMP_PATH)"


# Perform create-stack operation
.PHONY: create-stack-raw
create-stack-raw:
	# Create CloudFormation Stack
	aws cloudformation create-stack --stack-name "$(STACK_NAME)" --template-body file://cloudformation.yaml \
		$(regionArg) --capabilities CAPABILITY_IAM --parameters $(STACK_PARAMS)
	aws cloudformation wait stack-create-complete --stack-name "$(STACK_NAME)" $(regionArg)


# Create the stack, print output, and save to TARGET file
#  (must be separate from create-stack-raw because uses $(shell ...)
.PHONY: create-stack
create-stack: create-stack-raw
	$(eval STACK_ID := $(shell aws cloudformation describe-stacks --stack-name "$(STACK_NAME)" \
		$(regionArg) --output text --query 'Stacks[0].StackId' ))
	@echo "Add to your .env file: STACK_ID=$(STACK_ID)"
	@ [ -z "$(TARGET)" ] || echo -e "# Makefile on `date`\nSTACK_ID=$(STACK_ID)" >> "$(TARGET)"


# Update CloudFormation stack
.PHONY: update-stack
update-stack:
	aws cloudformation update-stack --stack-name "$(STACK_NAME)" --template-body file://cloudformation.yaml \
			$(regionArg) --capabilities CAPABILITY_IAM --parameters $(STACK_PARAMS)


# Perform describe-stack to retrieve name of Lambda function
.PHONY: load-lambda-name
load-lambda-name:
	# Load Lambda name from CloudFormation
	@if [ -z "$(STACK_NAME)" ]; then echo "Var STACK_NAME must be defined"; exit 1; fi;
	$(eval LAMBDA_NAME := $(shell aws cloudformation describe-stacks --stack-name "$(STACK_NAME)" \
		$(regionArg) --output text --query 'Stacks[0].Outputs[?OutputKey==`LambdaFunction`].OutputValue'))
	@echo "Add to your .env file: LAMBDA_NAME=$(LAMBDA_NAME)"
	@ [ -z "$(TARGET)" ] || echo -e "# Makefile on `date`\nLAMBDA_NAME=$(LAMBDA_NAME)" >> "$(TARGET)"


# Update existing Lambda function
.PHONY: deploy
deploy: $(usesReleaseZip) $(usesLambdaName)
	# Update Lambda function code
	aws lambda update-function-code --function-name "$(LAMBDA_NAME)" \
		$(regionArg) --zip-file "fileb://$(RELEASE_ZIP)" --publish


# Copy local files to global S3 deployment buckets
REGIONS ?= \
  us-east-1 us-east-2 us-west-1 us-west-2 \
  eu-central-1 eu-west-1 eu-west-2 eu-west-3 \
  ap-northeast-1 ap-northeast-2 ap-south-1 ap-southeast-1 ap-southeast-2 \
  ca-central-1 sa-east-1
  # disabled: cn-north-1 cn-northwest-1
.PHONY: publish
publish: $(usesReleaseZip) $(REGIONS)
$(REGIONS):
	aws s3 cp "./cloudformation.yaml" "s3://aws-to-slack-$@" --acl public-read
	aws s3 cp "$(RELEASE_ZIP)" "s3://aws-to-slack-$@" --acl public-read
