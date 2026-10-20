import pandas as pd
from sdv.single_table import GaussianCopulaSynthesizer
from sdv.metadata import SingleTableMetadata

# Load the original dataset
print("Loading original dataset...")
df = pd.read_csv('dataset/click_fraud_dataset.csv')
print(f"Original dataset size: {len(df)} rows")

# Create metadata
print("\nCreating metadata...")
metadata = SingleTableMetadata()
metadata.detect_from_dataframe(df)

# Update metadata for specific columns if needed
# Set click_id and user_id as unique identifiers (we'll regenerate them)
metadata.update_column('click_id', sdtype='id')
metadata.update_column('user_id', sdtype='id')

print("\nMetadata created:")
print(metadata)

# Create and train the synthesizer
print("\nTraining GaussianCopula synthesizer...")
synthesizer = GaussianCopulaSynthesizer(metadata)
synthesizer.fit(df)

# Generate synthetic data
target_rows = 50000
rows_to_generate = target_rows - len(df)
print(f"\nGenerating {rows_to_generate} synthetic rows...")
synthetic_data = synthesizer.sample(num_rows=rows_to_generate)

# Combine original and synthetic data
print("\nCombining original and synthetic data...")
expanded_df = pd.concat([df, synthetic_data], ignore_index=True)

# Save the expanded dataset
output_path = 'dataset/click_fraud_dataset_expanded.csv'
print(f"\nSaving expanded dataset to {output_path}...")
expanded_df.to_csv(output_path, index=False)

print(f"\nSuccess! Dataset expanded from {len(df)} to {len(expanded_df)} rows")
print(f"Saved to: {output_path}")

# Display summary statistics
print("\n=== Dataset Summary ===")
print(f"Total rows: {len(expanded_df)}")
print(f"Original rows: {len(df)}")
print(f"Synthetic rows: {rows_to_generate}")
print(f"\nFraud distribution:")
print(expanded_df['is_fraudulent'].value_counts())
print(f"\nFraud percentage: {expanded_df['is_fraudulent'].mean() * 100:.2f}%")
