import org.bytedeco.opencv.opencv_core._
import org.bytedeco.opencv.global.opencv_imgcodecs._
import scala.collection.parallel.CollectionConverters._
import java.io.{File, FileWriter, BufferedWriter}
import java.util.concurrent.atomic.AtomicInteger

object CVDFilterBigData {

  // --- Color transformation matrices ---
  val protanopia = Array(
    Array(0.56667, 0.43333, 0.0),
    Array(0.55833, 0.44167, 0.0),
    Array(0.0, 0.24167, 0.75833)
  )
  val deuteranopia = Array(
    Array(0.625, 0.375, 0.0),
    Array(0.7, 0.3, 0.0),
    Array(0.0, 0.3, 0.7)
  )
  val tritanopia = Array(
    Array(0.95, 0.05, 0.0),
    Array(0.0, 0.43333, 0.56667),
    Array(0.0, 0.475, 0.525)
  )

  // --- Utility: blend matrices for multi-type CVD ---
  def blendMatrices(m1: Array[Array[Double]], m2: Array[Array[Double]], w1: Double, w2: Double): Array[Array[Double]] =
    Array.tabulate(3, 3)((i, j) => (m1(i)(j) * w1 + m2(i)(j) * w2) / (w1 + w2))

  // --- Apply CVD transformation to a pixel ---
  def transformPixel(rgb: Array[Double], matrix: Array[Array[Double]], severity: Double): Array[Double] = {
    val transformed = Array(
      rgb(0) * matrix(0)(0) + rgb(1) * matrix(0)(1) + rgb(2) * matrix(0)(2),
      rgb(0) * matrix(1)(0) + rgb(1) * matrix(1)(1) + rgb(2) * matrix(1)(2),
      rgb(0) * matrix(2)(0) + rgb(1) * matrix(2)(1) + rgb(2) * matrix(2)(2)
    )
    Array.tabulate(3)(i => (1 - severity) * rgb(i) + severity * transformed(i))
  }

  // --- Apply CVD filter to full image ---
  def applyCVD(imagePath: String, matrix: Array[Array[Double]], severity: Double): Mat = {
    val img = imread(imagePath)
    val output = img.clone()
    for (y <- 0.until(img.rows())) {
      for (x <- 0.until(img.cols())) {
        val pixel = img.ptr(y, x)
        val r = pixel.get(2) & 0xFF
        val g = pixel.get(1) & 0xFF
        val b = pixel.get(0) & 0xFF
        val result = transformPixel(Array(r, g, b), matrix, severity)
        pixel.put(0, result(2).toByte)
        pixel.put(1, result(1).toByte)
        pixel.put(2, result(0).toByte)
      }
    }
    output
  }

  // --- Process dataset and record metadata ---
  def processDataset(inputFolder: String, outputFolder: String, metadataPath: String): Unit = {
    val imgFiles = new File(inputFolder)
      .listFiles()
      .filter(f => f.getName.endsWith(".jpg") || f.getName.endsWith(".png"))
      .par

    val bw = new BufferedWriter(new FileWriter(metadataPath, true))
    if (new File(metadataPath).length() == 0) {
      bw.write("img_name,protanopia_severity,deuteranopia_severity,tritanopia_severity,combination_type\n")
    }

    val severities = Seq(0.3, 0.6, 1.0)
    val counter = new AtomicInteger(0)

    imgFiles.foreach { imgFile =>
      val imgName = imgFile.getName.stripSuffix(".jpg").stripSuffix(".png")
      val inputPath = imgFile.getAbsolutePath

      val alreadyProcessed = new File(outputFolder).listFiles().exists(f => f.getName.startsWith(imgName))
      if (!alreadyProcessed) {

        // --- Original image ---
        val orig = imread(inputPath)
        val origName = s"${imgName}_normal.jpg"
        imwrite(s"$outputFolder/$origName", orig)
        bw.synchronized { bw.write(s"$origName,0.0,0.0,0.0,none\n") }

        // --- Single CVD types ---
        for (s <- severities) {
          val pImg = applyCVD(inputPath, protanopia, s)
          val pName = s"${imgName}_protanopia_s${s}.jpg"
          imwrite(s"$outputFolder/$pName", pImg)
          bw.synchronized { bw.write(s"$pName,${s},0.0,0.0,single\n") }

          val dImg = applyCVD(inputPath, deuteranopia, s)
          val dName = s"${imgName}_deuteranopia_s${s}.jpg"
          imwrite(s"$outputFolder/$dName", dImg)
          bw.synchronized { bw.write(s"$dName,0.0,${s},0.0,single\n") }

          val tImg = applyCVD(inputPath, tritanopia, s)
          val tName = s"${imgName}_tritanopia_s${s}.jpg"
          imwrite(s"$outputFolder/$tName", tImg)
          bw.synchronized { bw.write(s"$tName,0.0,0.0,${s},single\n") }
        }

        // --- Combined CVD pairs ---
        for (s1 <- severities; s2 <- severities) {
          val pd = blendMatrices(protanopia, deuteranopia, s1, s2)
          val pdImg = applyCVD(inputPath, pd, (s1 + s2) / 2)
          val pdName = s"${imgName}_proto_deut_s${s1}_${s2}.jpg"
          imwrite(s"$outputFolder/$pdName", pdImg)
          bw.synchronized { bw.write(s"$pdName,${s1},${s2},0.0,combined\n") }

          val pt = blendMatrices(protanopia, tritanopia, s1, s2)
          val ptImg = applyCVD(inputPath, pt, (s1 + s2) / 2)
          val ptName = s"${imgName}_proto_trit_s${s1}_${s2}.jpg"
          imwrite(s"$outputFolder/$ptName", ptImg)
          bw.synchronized { bw.write(s"$ptName,${s1},0.0,${s2},combined\n") }

          val dt = blendMatrices(deuteranopia, tritanopia, s1, s2)
          val dtImg = applyCVD(inputPath, dt, (s1 + s2) / 2)
          val dtName = s"${imgName}_deut_trit_s${s1}_${s2}.jpg"
          imwrite(s"$outputFolder/$dtName", dtImg)
          bw.synchronized { bw.write(s"$dtName,0.0,${s1},${s2},combined\n") }
        }

        val c = counter.incrementAndGet()
        if (c % 100 == 0) println(s"Processed $c images...")

      } else println(s"⏭ Skipping already processed: ${imgFile.getName}")
    }

    bw.close()
  }

  def main(args: Array[String]): Unit = {
    val inputFolder = "C:/Users/Vaishnavi Gupta/fiftyone/coco-2017/train/data"
    val outputFolder = "D:/BDA/processedData"
    val metadataPath = s"$outputFolder/metadata.csv"

    new File(outputFolder).mkdirs()
    processDataset(inputFolder, outputFolder, metadataPath)
    println("✅ All images processed successfully!")
  }
}
