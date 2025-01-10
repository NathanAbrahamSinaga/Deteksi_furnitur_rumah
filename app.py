from flask import Flask, render_template, request, jsonify
import tensorflow as tf
import numpy as np
import json
import os
import base64
from PIL import Image
from io import BytesIO
from datetime import datetime

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

model = tf.keras.models.load_model('furniture_recognition_model.h5')
with open('class_labels.json', 'r') as f:
    class_labels = json.load(f)

def proses_gambar(gambar_base64):
    format, imgstr = gambar_base64.split(';base64,')
    gambar_bytes = base64.b64decode(imgstr)
    
    gambar = Image.open(BytesIO(gambar_bytes))
    gambar = gambar.convert('RGB')
    gambar = gambar.resize((150, 150))
    
    gambar_array = tf.keras.preprocessing.image.img_to_array(gambar)
    gambar_array = tf.expand_dims(gambar_array, 0)
    gambar_array = gambar_array / 255.0
    
    return gambar_array

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/prediksi', methods=['POST'])
def prediksi():
    try:
        data = request.get_json()
        gambar_base64 = data.get('gambar')
        
        if not gambar_base64:
            return jsonify({'error': 'Tidak ada gambar yang diterima'}), 400
        
        gambar_array = proses_gambar(gambar_base64)
        
        prediksi = model.predict(gambar_array)
        kelas_prediksi = class_labels[np.argmax(prediksi)]
        tingkat_keyakinan = float(np.max(prediksi))
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        nama_file = f'upload_{timestamp}.jpg'
        lokasi_file = os.path.join(app.config['UPLOAD_FOLDER'], nama_file)
        
        format, imgstr = gambar_base64.split(';base64,')
        gambar_bytes = base64.b64decode(imgstr)
        with open(lokasi_file, 'wb') as f:
            f.write(gambar_bytes)
        
        return jsonify({
            'kelas': kelas_prediksi,
            'keyakinan': tingkat_keyakinan,
        })
        
    except Exception as e:
        return jsonify({'error': f'Terjadi kesalahan: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)