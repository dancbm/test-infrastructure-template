data "archive_file" "api_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../api"
  output_path = "${path.module}/api.zip"
}

data "aws_iam_policy_document" "access_dynamodb_table_document" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:BatchGetItem",
      "dynamodb:BatchWriteItem",
      "dynamodb:ConditionCheckItem",
      "dynamodb:PutItem",
      "dynamodb:DescribeTable",
      "dynamodb:DeleteItem",
      "dynamodb:GetItem",
      "dynamodb:Scan",
      "dynamodb:Query",
      "dynamodb:UpdateItem"
    ]
    resources = [
      aws_dynamodb_table.task_app_table.arn
    ]
  }
}

resource "aws_iam_role" "lambda_execution_role" {
  name = "lambda_execution_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "lambda.amazonaws.com"
        },
      },
    ],
  })
}

resource "aws_iam_policy" "access_dynamodb_table_policy" {
  name   = "access_dynamodb_table_policy"
  policy = data.aws_iam_policy_document.access_dynamodb_table_document.json
}

resource "aws_iam_role_policy_attachment" "lambda_access_dynamodb_table_policy_attachment" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = aws_iam_policy.access_dynamodb_table_policy.arn
}

resource "aws_iam_role_policy_attachment" "lambda_execution_role_policy_attachment" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "task_app_lambda_function" {
  function_name    = "task_app_lambda_function"
  role             = aws_iam_role.lambda_execution_role.arn
  filename         = data.archive_file.api_zip.output_path
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  source_code_hash = filebase64sha256(data.archive_file.api_zip.output_path)
}

resource "aws_lambda_function_url" "task_app_lambda_function_url" {
  function_name      = aws_lambda_function.task_app_lambda_function.function_name
  authorization_type = "AWS_IAM"

  cors {
    allow_credentials = true
    allow_origins     = ["*"]
    allow_methods     = ["*"]
    allow_headers     = ["*"]
    expose_headers    = ["*"]
    max_age           = 86400
  }
}

output "API_URL" {
  value = aws_lambda_function_url.task_app_lambda_function_url.function_url
}
