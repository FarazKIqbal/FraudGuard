import csv
import random
from datetime import datetime, timedelta

def generate_test_data(num_samples=100):
    """
    Generate test data for batch prediction testing
    """
    # Current timestamp for reference
    current_time = datetime.now()
    
    # Define possible values for categorical fields
    device_types = ['Desktop', 'Mobile', 'Tablet', 'Bot']
    browsers = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera', 'Unknown']
    operating_systems = ['Windows', 'macOS', 'Linux', 'Android', 'iOS']
    ad_positions = ['top', 'middle', 'bottom', 'sidebar']
    ip_reputations = ['trusted', 'neutral', 'suspicious']
    
    # Generate data
    data = []
    
    # Create some normal user behavior (60%)
    for _ in range(int(num_samples * 0.6)):
        # Random time within the last 24 hours
        random_minutes = random.randint(1, 1440)  # minutes in a day
        timestamp = (current_time - timedelta(minutes=random_minutes)).isoformat()
        
        # Format time of day as HH:MM
        hour = random.randint(8, 22)  # Business hours
        minute = random.randint(0, 59)
        time_of_day = f"{hour:02d}:{minute:02d}"
        
        row = {
            'timestamp': timestamp,
            'device_type': random.choice(['Desktop', 'Mobile', 'Tablet']),
            'browser': random.choice(['Chrome', 'Firefox', 'Safari', 'Edge']),
            'operating_system': random.choice(['Windows', 'macOS', 'iOS', 'Android']),
            'ad_position': random.choice(ad_positions),
            'device_ip_reputation': 'trusted',
            'scroll_depth': random.randint(50, 100),
            'mouse_movement': random.randint(200, 600),
            'keystrokes_detected': random.randint(50, 200),
            'click_duration': round(random.uniform(0.8, 2.0), 2),
            'bot_likelihood_score': round(random.uniform(0.0, 0.3), 2),
            'VPN_usage': 0,
            'proxy_usage': 0,
            'click_frequency': random.randint(1, 10),
            'time_on_site': random.randint(120, 600),
            'time_of_day': time_of_day
        }
        data.append(row)
    
    # Create some suspicious behavior (40%)
    for _ in range(int(num_samples * 0.4)):
        # Random time within the last 24 hours
        random_minutes = random.randint(1, 1440)
        timestamp = (current_time - timedelta(minutes=random_minutes)).isoformat()
        
        # Format time of day as HH:MM - more likely during night hours
        hour = random.randint(0, 6) if random.random() < 0.7 else random.randint(0, 23)
        minute = random.randint(0, 59)
        time_of_day = f"{hour:02d}:{minute:02d}"
        
        row = {
            'timestamp': timestamp,
            'device_type': random.choice(['Mobile', 'Bot']) if random.random() < 0.7 else random.choice(device_types),
            'browser': random.choice(['Unknown', 'Chrome']) if random.random() < 0.7 else random.choice(browsers),
            'operating_system': random.choice(['Android', 'Unknown']) if random.random() < 0.6 else random.choice(operating_systems),
            'ad_position': random.choice(['top', 'bottom']),
            'device_ip_reputation': random.choice(['suspicious', 'neutral']),
            'scroll_depth': random.randint(0, 30),
            'mouse_movement': random.randint(0, 100),
            'keystrokes_detected': random.randint(0, 20),
            'click_duration': round(random.uniform(0.1, 0.5), 2),
            'bot_likelihood_score': round(random.uniform(0.6, 1.0), 2),
            'VPN_usage': 1 if random.random() < 0.7 else 0,
            'proxy_usage': 1 if random.random() < 0.6 else 0,
            'click_frequency': random.randint(20, 100),
            'time_on_site': random.randint(1, 60),
            'time_of_day': time_of_day
        }
        data.append(row)
    
    # Shuffle the data
    random.shuffle(data)
    
    return data

def save_to_csv(data, filename="test_clicks.csv"):
    """
    Save the generated data to a CSV file
    """
    # Get all field names from the first row
    fieldnames = list(data[0].keys())
    
    # Write to CSV
    with open(filename, 'w', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    
    print(f"Generated {len(data)} test records and saved to {filename}")

if __name__ == "__main__":
    import sys
    
    # Get number of samples from command line, default to 100
    num_samples = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    
    # Get output filename from command line, default to test_clicks.csv
    output_file = sys.argv[2] if len(sys.argv) > 2 else "test_clicks.csv"
    
    # Generate and save data
    test_data = generate_test_data(num_samples)
    save_to_csv(test_data, output_file)
    
    print("CSV file created successfully!")
    print(f"You can use this file to test the batch prediction functionality.")
    print(f"Usage example: Upload {output_file} to the batch prediction page.")