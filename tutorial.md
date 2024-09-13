<walkthrough-metadata>
  <meta name="title" content="PFE Jissen" />
  <meta name="description" content="Hands-on Platform Engineering with Cloud Run" />
  <meta name="component_id" content="110" />
</walkthrough-metadata>

<walkthrough-disable-features toc></walkthrough-disable-features>

# Platform Engineering Handson Cloud Run 編

## Google Cloud プロジェクトの設定、確認

### **1. 対象の Google Cloud プロジェクトを設定**

ハンズオンを行う Google Cloud プロジェクトのプロジェクト ID を環境変数に設定し、以降の手順で利用できるようにします。

```bash
export PROJECT_ID=$(gcloud config get-value project)
```

## **環境準備**

<walkthrough-tutorial-duration duration=10></walkthrough-tutorial-duration>

最初に、ハンズオンを進めるための環境準備を行います。

下記の設定を進めていきます。

- gcloud コマンドラインツール設定
- Google Cloud 機能（API）有効化設定

## **gcloud コマンドラインツール**

Google Cloud は、コマンドライン（CLI）、GUI から操作が可能です。ハンズオンでは主に CLI を使い作業を行いますが、GUI で確認する URL も合わせて掲載します。

### **1. gcloud コマンドラインツールとは?**

gcloud コマンドライン インターフェースは、Google Cloud でメインとなる CLI ツールです。このツールを使用すると、コマンドラインから、またはスクリプトや他の自動化により、多くの一般的なプラットフォーム タスクを実行できます。

たとえば、gcloud CLI を使用して、以下のようなものを作成、管理できます。

- Google Compute Engine 仮想マシン
- Google Kubernetes Engine クラスタ
- Google Cloud SQL インスタンス

**ヒント**: gcloud コマンドラインツールについての詳細は[こちら](https://cloud.google.com/sdk/gcloud?hl=ja)をご参照ください。

### **2. gcloud から利用する Google Cloud のデフォルトプロジェクトを設定**

gcloud コマンドでは操作の対象とするプロジェクトの設定が必要です。操作対象のプロジェクトを設定します。

```bash
gcloud config set project ${PROJECT_ID}
```

承認するかどうかを聞かれるメッセージがでた場合は、`承認` ボタンをクリックします。

### **3. ハンズオンで利用する Google Cloud の API を有効化する**

Google Cloud では利用したい機能ごとに、有効化を行う必要があります。
ここでは、以降のハンズオンで利用する機能を事前に有効化しておきます。（4,5分ほどかかります）
〜finished successfully というメッセージが出たら正常に終了しています。

```bash
gcloud services enable cloudbuild.googleapis.com container.googleapis.com artifactregistry.googleapis.com clouddeploy.googleapis.com workstations.googleapis.com run.googleapis.com secretmanager.googleapis.com
```

**GUI**: [API ライブラリ](https://console.cloud.google.com/apis/library?project={{project-id}})

## **4. gcloud コマンドラインツール設定 - リージョン、ゾーン**

コンピュートリソースを作成するデフォルトのリージョン、ゾーンとして、東京 (asia-northeast1/asia-northeast1-c）を指定します。

```bash
gcloud config set compute/region asia-northeast1 && gcloud config set compute/zone asia-northeast1-c
```

## **参考: Cloud Shell の接続が途切れてしまったときは?**

一定時間非アクティブ状態になる、またはブラウザが固まってしまったなどで `Cloud Shell` が切れてしまう、またはブラウザのリロードが必要になる場合があります。その場合は以下の対応を行い、チュートリアルを再開してください。

### **01. チュートリアル資材があるディレクトリに移動する**

```bash
cd ~/pfe-handson-run
```

### **02. チュートリアルを開く**

```bash
teachme tutorial.md
```

### **03. プロジェクト ID を設定する**

ハンズオンを行う Google Cloud プロジェクトのプロジェクト ID を環境変数に設定し、以降の手順で利用できるようにします。

```bash
export PROJECT_ID=$(gcloud config get-value project)
```

### **4. gcloud のデフォルト設定**

```bash
gcloud config set project ${PROJECT_ID} && gcloud config set compute/region asia-northeast1 && gcloud config set compute/zone asia-northeast1-c
```


## **Lab-00.Lab 向けクラスタの準備**
<walkthrough-tutorial-duration duration=20></walkthrough-tutorial-duration>


### **Lab-00-01. VPC の作成**

今回の Lab 用 VPC を作成します。

```bash
gcloud compute networks create ws-network \
  --subnet-mode custom
```

### **Lab-00-02. サブネットの作成**

作成した VPC にサブネットを作成します。

```bash
gcloud compute networks subnets create ws-subnet \
  --network ws-network \
  --region asia-northeast1 \
  --range "192.168.1.0/24"
```

### **Lab-00-03. Cloud Router の作成**

Cloud NAT を設定するため、Cloud Router を作成しておきます。


```bash
gcloud compute routers create \
  ws-router \
  --network ws-network \
  --region asia-northeast1
```

### **Lab-00-04. Cloud NAT の作成**

GKE Cluster や Cloud Workstations は外部 IP を持たせない設定となるため、Cloud NAT を設定しておきます。

```bash
gcloud compute routers nats create ws-nat \
  --router ws-router \
  --auto-allocate-nat-external-ips \
  --nat-all-subnet-ip-ranges \
  --region asia-northeast1
```

### **Lab-00-05. WS クラスタ の作成**

Cloud Workstations 用のクラスタを作成します。
この作業は同一のリージョンで一度だけ必要で、作成完了まで 25 分程度かかります。

```bash
gcloud workstations clusters create cluster-handson \
  --network "projects/$PROJECT_ID/global/networks/ws-network" \
  --subnetwork "projects/$PROJECT_ID/regions/asia-northeast1/subnetworks/ws-subnet" \
  --region asia-northeast1 \
  --async
```

以上で事前準備は完了です。

## **Lab-01. Cloud Workstations による Golden Path の提供**
Platform Engineering の観点から、開発者に作成ずみの開発環境とサンプルとなるアプリケーションのテンプレートを提供します。
また、Platform 利用者に立場に立って、アプリケーションのデプロイを試してみます。

### **Lab-01-01. Artifact Registry 作成**
Cloud Workstations イメージを保管するためにレポジトリを作成します。

```bash
gcloud artifacts repositories create ws-repo \
  --repository-format docker \
  --location asia-northeast1 \
  --description="Docker repository for Cloud workstations"
```

### **Lab-01-02. Cloud Workstations コンテナイメージの作成**

開発者がサンプルコードを起動するためのライブラリや Code OSS 拡張機能を事前に有効化したイメージを作成します。
今回はあらかじめ用意したサンプルコードを利用します。中身は以下で確認できます。

```bash
cat lab-01/workstations/Dockerfile
```
Cloud Build を利用して、Cloud Workstations コンテナイメージをビルドします。
(赤字でメッセージが出ることがありますが、問題ございません。)

```bash
gcloud builds submit lab-01/workstations/ \
  --tag asia-northeast1-docker.pkg.dev/${PROJECT_ID}/ws-repo/codeoss-node:v1
```

### **Lab-01-03. Cloud Workstations イメージ Pull 用のサービスアカウントの設定**

プライベートなカスタムイメージを利用するため、Artifact Registry から Pull できる権限を持つサービスアカウントを作成しておきます。

```bash
gcloud iam service-accounts create codeoss-customized-sa \
  --display-name "Service Account for codeoss-customized config"
```
サービスアカウントに権限を付与しておきます。今回は、Artifact Registry から Pull できる権限で十分なため、`artifactregistry.reader`を付与します。


```bash
gcloud artifacts repositories add-iam-policy-binding ws-repo \
  --location asia-northeast1 \
  --member serviceAccount:codeoss-customized-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --role=roles/artifactregistry.reader
```

### **Lab-01-04. Cloud Workstations 構成の作成**

開発者むけにカスタマイズしたコンテナイメージを利用して Cloud Workstations の構成を作成します。

```bash
gcloud workstations configs create codeoss-node \
  --machine-type e2-standard-4 \
  --pd-disk-size 200 \
  --pd-disk-type pd-standard \
  --region asia-northeast1 \
  --cluster cluster-handson \
  --disable-public-ip-addresses \
  --shielded-integrity-monitoring \
  --shielded-secure-boot \
  --shielded-vtpm \
  --service-account codeoss-customized-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --container-custom-image asia-northeast1-docker.pkg.dev/${PROJECT_ID}/ws-repo/codeoss-node:v1
```

### **Lab-01-05. Workstations の作成**

開発者むけに一台、Workstations を作成します。この作業は、通常、開発者ごとに行うことになります。

```bash
gcloud workstations create ws-node-dev \
  --region asia-northeast1 \
  --cluster cluster-handson \
  --config codeoss-node
```
### **Lab-01-06. CI/CD パイプラインの準備**

Platform Engineering の要素の一つとして、デプロイの自動化があります。
プラットフォームの管理者として開発者が簡単にデプロイできるように Cloud Build/Cloud Deploy を使ってパイプラインを構築しておきます。
今回はハンズオンのために準備したファイルを活用してパイプラインを準備します。
各ファイルの中身を確認しておきます。

カレントディレクトを移動して確認します。
```bash
cd $HOME/pfe-handson-run/lab-01/pets-api
```

```bash
cat cloudbuild.yaml
```

```bash
cat clouddeploy.yaml
```

このファイルは`{PROJECT_NUMBER}`がプレースホルダーになっていますので、各自の環境に合わせて置換します。

```bash
sed -i "s|\${PROJECT_ID}|$PROJECT_ID|g" clouddeploy.yaml
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
sed -i "s|\${PROJECT_NUMBER}|$PROJECT_NUMBER|g" clouddeploy.yaml
```

正しく反映されているか確認します。
```bash
cat clouddeploy.yaml
```

まずは、パイプラインとターゲットを Cloud Deploy に登録します。これによりアプリケーションをデプロイするための
Cloud Run サービスおよび、dev / prod という順序性が定義されます。

```bash
gcloud deploy apply --file clouddeploy.yaml --region=asia-northeast1 --project=$PROJECT_ID
```

ビルド、デプロイ方法は、`skaffold.yaml`および `manifest.yaml` に定義されています。ここには、デプロイに利用するマニフェスト、およびデプロイに対応する成果物が定義されています。

```bash
cat skaffold.yaml
cat manifest.yaml
```
このファイルも`{PROJECT_NUMBER}`がプレースホルダーになっていますので、各自の環境に合わせてそれぞれ置換します。

```bash
sed -i "s|\${PROJECT_ID}|$PROJECT_ID|g" skaffold.yaml
```
```bash
sed -i "s|\${PROJECT_ID}|$PROJECT_ID|g" manifest.yaml
```

Artifact Registry に CI で作成する成果物であるコンテナイメージを保管するためのレポジトリを作成しておきます。

```bash
gcloud artifacts repositories create app-repo \
  --repository-format docker \
  --location asia-northeast1 \
  --description="Docker repository for Platform users"
```
Cloud Build から Cloud Deploy を利用するにあたっていくつか権限が必要になるため、サービスアカウントに付与します。

```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
```
```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/clouddeploy.admin"
```

```bash
gcloud iam service-accounts add-iam-policy-binding $COMPUTE_SA \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/iam.serviceAccountUser" \
    --project=$PROJECT_ID
```

CI/CD パイプラインのテストとして手動で初回ビルドを試してみます。

```bash
gcloud builds submit --config cloudbuild.yaml .
```

順番にコンテナのビルドと、Cloud Run へのデプロイが実施されます。
便宜上、asia-northeast1 を dev 、us-central1を prod として見立てています。
今回の qwiklabs ではプロジェクトを複数持つことが許可されていないため、このような仕様としています。
実際にはそれぞれ異なるプロジェクト（本番、開発）をパイプラインの中に含めることが可能です。

[Cloud Run](https://console.cloud.google.com/run)へブラウザからアクセスします。
random-pets と言う名前のアプリケーションがデプロイされています。
ですがこのままですと、認証情報をヘッダーに付与した場合しかアクセスできないような仕様となっており、ブラウザからのアクセスができません。
そのため、`random-pets` > セキュリティ タブより認証の設定を `未認証の呼び出しを許可` にチェックします
すると上部の URL がクリックできるようになります。
URL の最後に `/random-pets` とパスを付与すると API にアクセス可能となり json のレスポンスが帰ってきます。

### **Lab-01-06. レポジトリとの接続**

先ほどは、手動でビルドトリガーを設定しましたが、今度は github にアプリケーションの変更がコミット（またはマージ）されたら自動で CI/CD が実行されるように変更します。
サンプルアプリケーションのレポジトリを自身のレポジトリへフォークします。
ウェブブラウザの URL バーに `https://github.com/ssekimoto/pfe-handson-run.git` を入力して移動します。
移動先で画面上部の Fork をクリックします。その後任意の名前のレポジトリにフォークします。

続いて、Cloud Build のコンソール画面からビルドトリガーを設定します。

<walkthrough-path-nav path="https://console.cloud.google.com/cloud-build" >Cloud Build に移動</walkthrough-path-nav>

Cloud Build で GitHub リポジトリを利用するために、GitHub リポジトリとの連携を設定します。

左のサイドバーよりリポジトリ</walkthrough-spotlight-pointer>メニューに遷移します。

<walkthrough-spotlight-pointer locator="semantic({tab '第 2 世代'})" validationPath="/cloud-build/repositories/2nd-gen">第2世代</walkthrough-spotlight-pointer>のタブを選択して、<walkthrough-spotlight-pointer locator="semantic({button 'ホスト接続を作成'})" validationPath="/cloud-build/repositories/2nd-gen">ホスト接続を作成</walkthrough-spotlight-pointer>より GitHub リポジトリとの接続を行います。
 `[新しいホストに接続]`にて、プロバイダ`[GitHub]`を選択します。
   - リージョン：`asia-northeast1`
   - 名前：`cloudrun-handson`
<walkthrough-spotlight-pointer locator="semantic({button '接続'})" validationPath="/cloud-build/connections/create">接続</walkthrough-spotlight-pointer>ボタンを押します。

GitHubのページに遷移をし、Google Cloud Buildに対するPermissionを求められます。
`[Authorize Google Cloud Build]`を押し、許可をします。

Cloud Buildの画面に戻り、`[既存のGitHubインストールの使用]`が表示されます。
`[インストール]`ボタンを押し、**組織ではなく個人のGitHubアカウント**を選択して `[確認]`を押します。
次に`[リポジトリをリンク]`を押下します。

先ほど作成したホスト接続を選択し、リポジトリには `pfe-handson-run` を選択して`[OK]`、続いて`[リンク]`を押します。

以上でGitHubリポジトリとの接続が完了しました。

### **Lab-01-07. Build トリガーの設定**


最後に、Cloud Buildのトリガを作成します。
<walkthrough-spotlight-pointer locator="semantic({link 'トリガー、5/4'})" validationPath="/cloud-build/.*">トリガー</walkthrough-spotlight-pointer>
に移動します。

`+トリガーを作成`をクリックします。
名前に`cloudrun-trigger`を入力します。
リージョンに `asia-northeast1(東京)`を選択します。
ソースは、第2世代 にチェックを入れ、レポジトリは、[ユーザ名]-pfe-handson-run を選択します。
Cloud Build 構成ファイルの場所に`lab-02/pets-api/cloudbuild.yaml`を入力します。
サービスアカウントには、`${PROJECT_NUMBER}-compute@developer.gserviceaccount.com`を指定します。`{PROJECT_NUMBER}`は実際の番号です。
以上を入力して作成を完了します。

以上で、プラットフォーム管理者としての作業は終わりました。
続いて実際にプラットフォームを利用する開発者としての体験をしてみます。

## **Lab-02. Golden Path を利用した開発体験**

### **Lab-02-01. Workstations の起動**
開発者はまず、自分の Workstations を起動することになります。
GUI での作業となります。
ブラウザで新しいタブを開き、[Workstations一覧](https://console.cloud.google.com/workstations/list)を開きます。
**My workstations** に表示される `ws-spring-dev`の 起動 をクリックします。
起動には数分程度かかります。
ステータスが、稼働中になりましたら、開始をクリックします。新しいタブで Code OSS の Welcome 画面が開きます。初回は表示に少し時間がかかります。

### **Lab-02-02. サンプルアプリケーションの入手**
git よりサンプルアプリケーションを取得します。
左側の2番目のアイコンをクリック、または、Ctrl + Shift + E の入力で、EXPLORER が開きます。
Clone Repository を選択します。

上部に開いた URL バーに `https://github.com/[ユーザー名]/pfe-handson-run.git`と入力します。
入力後、`Github から複製を複製`をクリックします。
そのまま自身の Github への認証を実施します。
複製するフォルダーを選択してください、はそのまま OK をクリックしてください。
続いて 複製したレポジトリを開きますか？または現在のワークスペースに追加しますか？という選択には、`開く(Open)`を選択してください。

### **Lab-02-03. サンプルアプリケーションの実行**
まずは、手元のローカル（Cloud Workstations 自体の中）でアプリケーションをテスト実行してみます。
左上の３本の線のアイコンから、Terminal > New Terminal を選択します。
画面下にターミナルが現れますので、こちらで作業を実施します。

アプリケーションのあるディレクトリに移動します。

```bash
cd lab-02/pets-api
```

アプリケーションをビルドします。

```bash
npm install
npm run build
```

ビルドしたアプリケーションをまずは Workstations 上で実行します。

```bash
npm start
```

実行すると 右下に Open Preview という吹き出しが現れるので、クリックします。
続いて、Open をクリックするとアプリケーションにアクセスできます。
URL の最後に `/random-pets` とパスを付与すると API にアクセス可能となり json のレスポンスが帰ってきます。
完了したら、ターミナルに戻り、Ctrl-C でアプリケーションを停止しておきます。

### **Lab-02-4. アプリケーションの更新**
ここでは実際にアプリケーションを変更し、変更をコミットします。
下記のファイルの一部を修正します。
```
pfe-handson/lab-02/pets-api/src/app.ts
```
参考までに sample.txt というファイルをおいているので、
更新する際にこちらへ内容を置き換えていただいても問題ございません。
また各ファイルのプレースホルダーを変更します。プロジェクト ID は各環境に合わせて入力します。

```
export $PROJECT_ID=qwiklabs-gcp-xx-xxxxxx
export $PROJECT_NUMBER=xxxxxxxxxxxx
```
```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
sed -i "s|\${PROJECT_ID}|$PROJECT_ID|g" cloudbuild.yaml
sed -i "s|\${PROJECT_ID}|$PROJECT_ID|g" clouddeploy.yaml
sed -i "s|\${PROJECT_NUMBER}|$PROJECT_NUMBER|g" clouddeploy.yaml
sed -i "s|\${PROJECT_ID}|$PROJECT_ID|g" skaffold.yaml
sed -i "s|\${PROJECT_ID}|$PROJECT_ID|g" manifest.yaml
```

左側のアイコンの Source Control よりメッセージを `"1st commit"`と入力して `コミット`をクリックします。
その後 `変更を同期`を再度クリックすると github へ変更がコミットされます。

するとトリガーが起動してパイプラインが実行されます。
[Cloud Deploy](https://console.cloud.google.com/deploy/delivery-pipelines)
に移動してデプロイがロールアウトされるのを確認します。
数分後デプロイされ、アプリケーションが更新されるを確認して Lab-02 は完了となります。
