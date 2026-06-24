CREATE TABLE IF NOT EXISTS lesson_unlocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  module_index INT NOT NULL,
  lesson_index INT NOT NULL,
  payment_id VARCHAR(120),
  amount DECIMAL(10,2) DEFAULT 14.99,
  status VARCHAR(30) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_lesson_unlock (user_email, module_index, lesson_index)
);

SELECT * FROM lesson_unlocks;
