import pandas as pd
import json

# Read the log file
df = pd.read_excel('Datasets/ocpp-log-1012-2.xlsx')

print(f'Total rows: {len(df)}')
print(f'\nColumns: {df.columns.tolist()}')
print(f'\nCommands: {df["command"].unique().tolist()}')

# Show samples of different command types
print('\n' + '='*80)
print('SAMPLE DATA FROM EACH COMMAND TYPE')
print('='*80)

for cmd in df['command'].unique()[:8]:
    rows = df[df['command'] == cmd]
    print(f'\n{cmd} ({len(rows)} rows):')
    sample = rows.iloc[0]['payLoadData']
    
    try:
        data = json.loads(sample) if isinstance(sample, str) else sample
        print(json.dumps(data, indent=2)[:600])
    except:
        print(str(sample)[:400])
    print('...\n')
