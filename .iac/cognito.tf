data "aws_iam_policy_document" "allow_lambda_function_url_invocation_document" {
  statement {
    effect = "Allow"
    actions = [
      "lambda:InvokeFunctionUrl",
    ]
    resources = [
      "${aws_lambda_function.task_app_lambda_function.arn}/*"
    ]
  }
}

resource "aws_cognito_identity_pool" "task_app_identity_pool" {
  identity_pool_name               = "task_app_identity_pool"
  allow_unauthenticated_identities = false
  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.task_app_user_pool_app_client.id
    provider_name           = "cognito-idp.eu-west-2.amazonaws.com/${aws_cognito_user_pool.task_app_user_pool.id}"
    server_side_token_check = true
  }
}

resource "aws_iam_role" "authorize_cognito_user_role" {
  name = "authorize_cognito_user_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow"
        Action = "sts:AssumeRoleWithWebIdentity"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" : aws_cognito_identity_pool.task_app_identity_pool.id
          }
          "ForAnyValue:StringLike" : {
            "cognito-identity.amazonaws.com:amr" : "authenticated"
          }
        }
      }
    ]
  })
}

resource "aws_iam_policy" "allow_lambda_function_url_invocation_policy" {
  name   = "allow_lambda_function_url_invocation_policy"
  policy = data.aws_iam_policy_document.allow_lambda_function_url_invocation_document.json
}

resource "aws_iam_role_policy_attachment" "allow_user_lambda_function_url_policy_attachment" {
  role       = aws_iam_role.authorize_cognito_user_role.name
  policy_arn = aws_iam_policy.allow_lambda_function_url_invocation_policy.arn
}

resource "aws_cognito_identity_pool_roles_attachment" "task_app_identity_pool_roles_attachment" {
  identity_pool_id = aws_cognito_identity_pool.task_app_identity_pool.id
  roles = {
    "authenticated" = aws_iam_role.authorize_cognito_user_role.arn
  }
}

resource "aws_cognito_user_pool" "task_app_user_pool" {
  name = "task_app_user_pool"
}

resource "aws_cognito_user" "task_app_user" {
  user_pool_id = aws_cognito_user_pool.task_app_user_pool.id
  username     = "task"
  password     = "Green123?"
}

resource "aws_cognito_user_pool_client" "task_app_user_pool_app_client" {
  name                = "task_app_app_client"
  user_pool_id        = aws_cognito_user_pool.task_app_user_pool.id
  generate_secret     = false
  explicit_auth_flows = ["USER_PASSWORD_AUTH"]
}

output "COGNITO_USER_POOL_ID" {
  value = aws_cognito_user_pool.task_app_user_pool.id
}

output "COGNITO_USER_POOL_APP_CLIENT_ID" {
  value = aws_cognito_user_pool_client.task_app_user_pool_app_client.id
}

output "COGNITO_IDENTITY_POOL_ID" {
  value = aws_cognito_identity_pool.task_app_identity_pool.id
}
