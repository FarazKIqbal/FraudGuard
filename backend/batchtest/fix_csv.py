import pandas as pd
import os
import traceback
from datetime import datetime, timedelta

def fix_csv_file(input_file, output_file=None):
    """
    Fix common issues in CSV files for batch prediction
    
    Args:
        input_file (str): Path to the input CSV file
        output_file (str, optional): Path to save the fixed CSV file. If None, will overwrite input file.
    
    Returns:
        str: Path to the fixed CSV file
    """
    print(f"Loading CSV file: {input_file}")
    
    try:
        # Check if file exists
        if not os.path.exists(input_file):
            print(f"Error: File not found: {input_file}")
            return None
            
        # Load the CSV file with error handling
        try:
            df = pd.read_csv(input_file)
            original_row_count = len(df)
            print(f"Loaded {original_row_count} rows")
        except Exception as e:
            print(f"Error reading CSV file: {e}")
            print("Detailed error:")
            traceback.print_exc()
            return None
        
        # Check for required columns
        required_columns = [
            'timestamp', 'device_type', 'browser', 'operating_system', 
            'ad_position', 'device_ip_reputation', 'scroll_depth', 
            'mouse_movement', 'keystrokes_detected', 'click_duration', 
            'bot_likelihood_score', 'VPN_usage', 'proxy_usage', 
            'click_frequency', 'time_on_site', 'time_of_day'
        ]
        
        # Print all columns for debugging
        print(f"Columns in CSV: {', '.join(df.columns)}")
        
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            print(f"Warning: Missing columns: {', '.join(missing_columns)}")
            # Add missing columns with default values
            for col in missing_columns:
                df[col] = "unknown" if col in ['device_type', 'browser', 'operating_system', 
                                              'ad_position', 'device_ip_reputation'] else 0
        
        # Fix timestamp format - ensure it's in the past
        if 'timestamp' in df.columns:
            try:
                # Print first few timestamps for debugging
                print(f"Sample timestamps before conversion: {df['timestamp'].head().tolist()}")
                
                # Convert to datetime
                df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
                
                # Check for NaT values after conversion
                nat_count = df['timestamp'].isna().sum()
                if nat_count > 0:
                    print(f"Warning: {nat_count} timestamps could not be parsed")
                
                # Check if dates are in the future
                current_time = datetime.now()
                future_dates = df['timestamp'] > current_time
                
                if future_dates.any():
                    print(f"Warning: {future_dates.sum()} timestamps are in the future")
                    # Adjust future dates to be in the past (2 years ago)
                    mask = df['timestamp'] > current_time
                    df.loc[mask, 'timestamp'] = df.loc[mask, 'timestamp'] - pd.DateOffset(years=2)
                
                # Convert back to ISO format string
                df['timestamp'] = df['timestamp'].dt.strftime('%Y-%m-%dT%H:%M:%S')
                
                # Print sample after conversion
                print(f"Sample timestamps after conversion: {df['timestamp'].head().tolist()}")
            except Exception as e:
                print(f"Error processing timestamps: {e}")
                traceback.print_exc()
        
        # Ensure numeric columns are numeric
        numeric_columns = [
            'scroll_depth', 'mouse_movement', 'keystrokes_detected', 
            'click_duration', 'bot_likelihood_score', 'VPN_usage', 
            'proxy_usage', 'click_frequency', 'time_on_site'
        ]
        
        for col in numeric_columns:
            if col in df.columns:
                try:
                    # Print sample values before conversion
                    print(f"Sample {col} values before conversion: {df[col].head().tolist()}")
                    
                    df[col] = pd.to_numeric(df[col], errors='coerce')
                    
                    # Check for NaN values after conversion
                    nan_count = df[col].isna().sum()
                    if nan_count > 0:
                        print(f"Warning: {nan_count} values in {col} could not be converted to numeric")
                    
                    # Fill NaN values with appropriate defaults
                    if col in ['VPN_usage', 'proxy_usage']:
                        df[col] = df[col].fillna(0).astype(int)
                    else:
                        df[col] = df[col].fillna(0)
                        
                    # Print sample after conversion
                    print(f"Sample {col} values after conversion: {df[col].head().tolist()}")
                except Exception as e:
                    print(f"Error converting {col} to numeric: {e}")
                    traceback.print_exc()
        
        # Remove rows with critical missing values
        original_count = len(df)
        df = df.dropna(subset=['device_type', 'browser', 'operating_system'])
        if len(df) < original_count:
            print(f"Removed {original_count - len(df)} rows with missing critical values")
        
        # Save the fixed CSV
        if output_file is None:
            output_file = input_file
        
        try:
            # Create directory if it doesn't exist
            output_dir = os.path.dirname(output_file)
            if output_dir and not os.path.exists(output_dir):
                os.makedirs(output_dir)
                
            df.to_csv(output_file, index=False)
            print(f"Fixed CSV saved to {output_file}")
            print(f"Final row count: {len(df)}")
            
            # Verify the file was created
            if os.path.exists(output_file):
                print(f"File successfully created: {output_file}")
                print(f"File size: {os.path.getsize(output_file)} bytes")
            else:
                print(f"Warning: File was not created: {output_file}")
                
            return output_file
        except Exception as e:
            print(f"Error saving CSV file: {e}")
            traceback.print_exc()
            return None
    
    except Exception as e:
        print(f"Unexpected error fixing CSV file: {e}")
        traceback.print_exc()
        return None

if __name__ == "__main__":
    import sys
    
    # Get input and output file paths from command line arguments
    input_file = sys.argv[1] if len(sys.argv) > 1 else "c:\\Users\\Lanovo\\Desktop\\DESKTOP\\Code\\MiniProject\\FraudGuard - Copy\\test_clicks.csv"
    output_file = sys.argv[2] if len(sys.argv) > 2 else "c:\\Users\\Lanovo\\Desktop\\DESKTOP\\Code\\MiniProject\\FraudGuard - Copy\\fixed_test_clicks.csv"
    
    result = fix_csv_file(input_file, output_file)
    if result:
        print("CSV file fixed successfully!")
    else:
        print("Failed to fix CSV file.")