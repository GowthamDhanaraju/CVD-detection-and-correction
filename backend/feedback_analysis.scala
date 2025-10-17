//D:\BDA\CVD_kafka>spark-shell

import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._
val spark = org.apache.spark.sql.SparkSession.builder().appName("Kafka Feedback Analysis").master("local[*]").getOrCreate()
import spark.implicits._
val filePath = "D:/BDA/CVD_kafka/feedback_kafka.json"
val rawDF = spark.read.option("multiline", "true").json(filePath)
val feedbackDF = rawDF.select(explode($"feedback_list").as("feedback"))
  .select(
    $"feedback.user_id",
    $"feedback.page_name",
    $"feedback.feedback_type",
    $"feedback.rating",
    $"feedback.kafka_sent",
    $"feedback.user_experience.ease_of_use".as("ease_of_use"),
    $"feedback.user_experience.accuracy".as("accuracy"),
    $"feedback.user_experience.usefulness".as("usefulness"),
    $"feedback.device_info.platform".as("platform"),
    $"feedback.timestamp"
  )

println("\nSample Feedback Rows:")
feedbackDF.show(5, truncate=false)

val totalFeedback = feedbackDF.count()
println(s"\nTotal Feedback: $totalFeedback")

val avgRatingRow = feedbackDF.select(avg($"feedback.rating")).first()
val avgRating = avgRatingRow.getDouble(0)
println(f"Average Rating: $avgRating%.2f")

println("\nFeedback Count by Page:")
feedbackDF.groupBy("page_name").count().show()

println("\nKafka Messages Stats:")
feedbackDF.groupBy("kafka_sent").count().show()

println("\nAverage User Experience by Page:")
feedbackDF.groupBy("page_name")
  .agg(
    avg("ease_of_use").as("avg_ease_of_use"),
    avg("accuracy").as("avg_accuracy"),
    avg("usefulness").as("avg_usefulness")
  ).show()

println("\nFeedback Count by Platform:")
feedbackDF.groupBy("platform").count().show()
//http://localhost:4040