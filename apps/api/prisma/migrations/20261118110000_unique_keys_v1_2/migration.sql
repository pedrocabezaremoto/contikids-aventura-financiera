-- CreateIndex
CREATE UNIQUE INDEX "ContentBlock_lessonId_order_key" ON "ContentBlock"("lessonId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_moduleId_order_key" ON "Lesson"("moduleId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Question_quizId_order_key" ON "Question"("quizId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Quiz_moduleId_type_key" ON "Quiz"("moduleId", "type");

