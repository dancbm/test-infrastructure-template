resource "aws_dynamodb_table" "task_app_table" {
  name           = "Tasks"
  hash_key       = "id"
  read_capacity  = 20
  write_capacity = 20

  attribute {
    name = "id"
    type = "S"
  }
}